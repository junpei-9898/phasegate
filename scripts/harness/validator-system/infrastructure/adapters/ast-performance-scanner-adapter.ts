/**
 * @layer infrastructure
 * @unit validator-system
 *
 * AstPerformanceScannerAdapter — PerformanceScannerPort実装
 * TypeScript Compiler API によるループ内 await 検出 + ファイルサイズチェック（L3-002）
 */
import * as ts from 'typescript';
import type { PerformanceScannerPort } from '../../domain/ports/performance-scanner-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const SUPPRESSION_MARKER = 'phasegate-ignore-performance';

export class AstPerformanceScannerAdapter implements PerformanceScannerPort {
  async scan(targetPaths: readonly string[], thresholds: Record<string, number>): Promise<{
    passed: boolean;
    findings: readonly HarnessErrorLike[];
  }> {
    const findings: HarnessErrorLike[] = [];

    for (const targetPath of targetPaths) {
      const filePaths = await expandTargetPath(targetPath);
      if (filePaths.length === 0) continue;

      // TypeScript program for AST-based await-in-loop detection
      const program = ts.createProgram(filePaths, {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.Node16,
        moduleResolution: ts.ModuleResolutionKind.Node16,
        allowJs: false,
        noEmit: true,
      });

      for (const filePath of filePaths) {
        try {
          const [fileStat, content] = await Promise.all([stat(filePath), readFile(filePath, 'utf8')]);
          if (content.includes(SUPPRESSION_MARKER)) {
            continue;
          }

          // Bundle size check (file-level size)
          const bundleSizeLimit = thresholds.bundleSizeLimit;
          if (typeof bundleSizeLimit === 'number' && fileStat.size > bundleSizeLimit) {
            findings.push(createFinding('L3-002', `bundleSizeLimit を超過しました: ${filePath} metric=file-size actual=${fileStat.size} threshold=${bundleSizeLimit}`));
          }

          // AST-based await-in-loop detection
          const sourceFile = program.getSourceFile(filePath);
          if (sourceFile && hasAwaitInLoop(sourceFile)) {
            findings.push(createFinding('L3-002', `ループ内 await を検出しました: ${filePath}`));
          }
          if (sourceFile && hasSyncIoCall(sourceFile)) {
            findings.push(createFinding('L3-002', `同期I/O呼び出しを検出しました: ${filePath} metric=sync-io threshold=0`));
          }
          const largeLiteralThreshold = thresholds.largeLiteralEntries ?? 80;
          if (sourceFile && hasLargeLiteral(sourceFile, largeLiteralThreshold)) {
            findings.push(createFinding('L3-002', `largeLiteralEntries を超過しました: ${filePath} metric=literal-entries threshold=${largeLiteralThreshold}`));
          }
        } catch {
          continue;
        }
      }
    }

    return { passed: findings.length === 0, findings };
  }
}

function hasSyncIoCall(root: ts.Node): boolean {
  let found = false;

  function visit(node: ts.Node): void {
    if (found) return;
    if (ts.isCallExpression(node)) {
      const expressionText = node.expression.getText(root.getSourceFile());
      if (/\b(?:readFileSync|writeFileSync|appendFileSync|readdirSync|statSync|existsSync|execFileSync|execSync|spawnSync)\b/.test(expressionText)) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(root);
  return found;
}

function hasLargeLiteral(root: ts.Node, threshold: number): boolean {
  let found = false;

  function visit(node: ts.Node): void {
    if (found) return;
    const literalSize = ts.isObjectLiteralExpression(node)
      ? node.properties.length
      : ts.isArrayLiteralExpression(node)
        ? node.elements.length
        : 0;
    if (literalSize > threshold) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(root);
  return found;
}

/**
 * ループノード（for/while/do/for-in/for-of）の直下に await が存在するか検出する。
 * ネストされた関数・アロー関数境界は越えない。
 */
function hasAwaitInLoop(root: ts.Node): boolean {
  let found = false;

  function visitForAwait(node: ts.Node): void {
    if (found) return;
    if (ts.isAwaitExpression(node)) {
      found = true;
      return;
    }
    // Do not cross function/arrow-function/method boundaries
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      return;
    }
    ts.forEachChild(node, visitForAwait);
  }

  function visit(node: ts.Node): void {
    if (found) return;
    if (
      ts.isForStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node)
    ) {
      visitForAwait(node);
    } else {
      ts.forEachChild(node, visit);
    }
  }

  visit(root);
  return found;
}

async function expandTargetPath(targetPath: string): Promise<string[]> {
  const absolutePath = resolve(process.cwd(), targetPath);

  try {
    const targetStat = await stat(absolutePath);
    if (targetStat.isDirectory()) {
      return walkTsFiles(absolutePath);
    }
    return absolutePath.endsWith('.ts') ? [absolutePath] : [];
  } catch {
    return [];
  }
}

async function walkTsFiles(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = join(root, entry.name);
      if (entry.isDirectory()) {
        return walkTsFiles(fullPath);
      }
      return fullPath.endsWith('.ts') ? [fullPath] : [];
    }));
    return files.flat();
  } catch {
    return [];
  }
}

function createFinding(code: string, message: string): HarnessErrorLike {
  return {
    code: { value: code, toString: () => code },
    severity: { value: 'warning', toString: () => 'warning' },
    message,
    suggestion: '対象ファイルのパフォーマンス上の問題を解消してください。',
  };
}
