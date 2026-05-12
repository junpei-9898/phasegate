/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-117
 *
 * BiomeAstSourceCodeAnalyzerAdapter — SourceCodeAnalyzerPort実装
 * TypeScript Compiler API を使用してエクスポートを正確に抽出する（L4-001, L4-003）
 */
import * as ts from 'typescript';
import type { SourceCodeAnalyzerPort, SourceAnalysisResult } from '../../domain/ports/source-code-analyzer-port.js';
import type { DriftElementRecord } from '../../domain/services/l4/drift-detection-service.js';
import { readdir } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';

const HARNESS_ROOT = join(process.cwd(), 'scripts', 'harness');

export interface BiomeAstSourceCodeAnalyzerAdapterOptions {
  readonly sourceRoot?: string;
  /** スキャン対象から除外するパスパターン（デフォルト: テストディレクトリを除外） */
  readonly excludePattern?: RegExp;
}

export class BiomeAstSourceCodeAnalyzerAdapter implements SourceCodeAnalyzerPort {
  private readonly sourceRoot: string;
  private readonly excludePattern: RegExp;

  constructor(options: BiomeAstSourceCodeAnalyzerAdapterOptions = {}) {
    this.sourceRoot = options.sourceRoot ?? HARNESS_ROOT;
    this.excludePattern = options.excludePattern ?? /__tests__\//;
  }

  async analyzeExports(targetUnits?: readonly string[]): Promise<readonly SourceAnalysisResult[]> {
    const targetFiles = await collectTargetFiles(this.sourceRoot, this.excludePattern, targetUnits);
    if (targetFiles.length === 0) return [];

    const program = ts.createProgram(targetFiles, {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.Node16,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      allowJs: false,
      noEmit: true,
    });

    const results: SourceAnalysisResult[] = [];
    for (const filePath of targetFiles) {
      const sourceFile = program.getSourceFile(filePath);
      if (!sourceFile) continue;
      results.push({
        unitName: resolveUnitName(this.sourceRoot, filePath, sourceFile.text),
        filePath,
        exports: extractExports(sourceFile),
        imports: extractImports(sourceFile),
      });
    }

    return results;
  }

  async getElements(targetUnits?: readonly string[]): Promise<string[]> {
    const results = await this.analyzeExports(targetUnits);
    return results.flatMap((result) => result.exports.map((entry) => entry.name));
  }

  /**
   * ISSUE-005 P3-9: element 名から unit 名を引けるマップを返す。
   * 同名 export が複数 unit に存在する場合は最初に見つかった unit を採用する。
   */
  async getElementUnitMap(targetUnits?: readonly string[]): Promise<Record<string, string>> {
    const results = await this.analyzeExports(targetUnits);
    const map: Record<string, string> = {};
    for (const result of results) {
      for (const entry of result.exports) {
        if (!(entry.name in map)) {
          map[entry.name] = result.unitName;
        }
      }
    }
    return map;
  }

  async getElementFilePathMap(targetUnits?: readonly string[]): Promise<Record<string, readonly string[]>> {
    const results = await this.analyzeExports(targetUnits);
    const map: Record<string, string[]> = {};
    for (const result of results) {
      for (const entry of result.exports) {
        map[entry.name] = [...(map[entry.name] ?? []), result.filePath];
      }
    }
    return map;
  }

  async getElementRecords(targetUnits?: readonly string[]): Promise<readonly DriftElementRecord[]> {
    const results = await this.analyzeExports(targetUnits);
    return results.flatMap((result) =>
      result.exports.map((entry) => ({
        element: entry.name,
        unitName: result.unitName,
        filePaths: [result.filePath],
      }))
    );
  }
}

type ExportType = SourceAnalysisResult['exports'][number]['type'];

function extractExports(sourceFile: ts.SourceFile): SourceAnalysisResult['exports'] {
  const exports: Array<{ name: string; type: ExportType }> = [];

  ts.forEachChild(sourceFile, (node) => {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const hasExport = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!hasExport) return;

    if (ts.isFunctionDeclaration(node) && node.name) {
      exports.push({ name: node.name.text, type: 'function' });
    } else if (ts.isClassDeclaration(node) && node.name) {
      exports.push({ name: node.name.text, type: 'class' });
    } else if (ts.isInterfaceDeclaration(node)) {
      exports.push({ name: node.name.text, type: 'interface' });
    } else if (ts.isTypeAliasDeclaration(node)) {
      exports.push({ name: node.name.text, type: 'type' });
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          exports.push({ name: decl.name.text, type: 'const' });
        }
      }
    } else if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          exports.push({ name: element.name.text, type: 'type' });
        }
      }
    } else if (ts.isExportDeclaration(node) && !node.exportClause) {
      const moduleSpecifier = node.moduleSpecifier;
      if (moduleSpecifier !== undefined && ts.isStringLiteral(moduleSpecifier)) {
        exports.push({ name: `* from ${moduleSpecifier.text}`, type: 'type' });
      }
    }

    const hasDefault = modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
    if (hasDefault) {
      exports.push({ name: 'default', type: 'type' });
    }
  });

  return exports;
}

function extractImports(sourceFile: ts.SourceFile): SourceAnalysisResult['imports'] {
  const imports: Array<{ source: string; name: string }> = [];

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    const source = node.moduleSpecifier.text;

    const clause = node.importClause;
    if (!clause) {
      imports.push({ source, name: '*' });
      return;
    }
    if (clause.name) {
      imports.push({ source, name: clause.name.text });
    }
    if (clause.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        imports.push({ source, name: clause.namedBindings.name.text });
      } else {
        for (const el of clause.namedBindings.elements) {
          imports.push({ source, name: el.name.text });
        }
      }
    }
  });

  return imports;
}

async function collectTargetFiles(
  sourceRoot: string,
  excludePattern: RegExp,
  targetUnits?: readonly string[],
): Promise<readonly string[]> {
  const roots = targetUnits && targetUnits.length > 0
    ? targetUnits.map((unit) => join(sourceRoot, unit))
    : [sourceRoot];

  const files: string[] = [];
  for (const root of roots) {
    files.push(...await walkTsFiles(root, excludePattern));
  }

  return files;
}

async function walkTsFiles(root: string, excludePattern: RegExp): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = join(root, entry.name);
      if (excludePattern.test(fullPath)) return [];
      if (entry.isDirectory()) {
        return walkTsFiles(fullPath, excludePattern);
      }
      return fullPath.endsWith('.ts') ? [fullPath] : [];
    }));
    return files.flat();
  } catch {
    return [];
  }
}

function resolveUnitName(sourceRoot: string, filePath: string, sourceText: string): string {
  const unitMatch = /@unit\s+([a-z0-9-]+)/i.exec(sourceText);
  if (unitMatch) return unitMatch[1];

  const relativePath = relative(sourceRoot, filePath);
  const [firstSegment] = relativePath.split(sep);
  return firstSegment || basename(filePath);
}
