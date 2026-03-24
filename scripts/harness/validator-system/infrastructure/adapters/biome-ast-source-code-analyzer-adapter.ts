/**
 * @layer infrastructure
 * @unit validator-system
 *
 * BiomeAstSourceCodeAnalyzerAdapter — SourceCodeAnalyzerPort実装
 * TypeScript Compiler API を使用してエクスポートを正確に抽出する（L4-001, L4-003）
 */
import * as ts from 'typescript';
import type { SourceCodeAnalyzerPort, SourceAnalysisResult } from '../../domain/ports/source-code-analyzer-port.js';
import { readdir } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';

const HARNESS_ROOT = join(process.cwd(), 'scripts', 'harness');

export class BiomeAstSourceCodeAnalyzerAdapter implements SourceCodeAnalyzerPort {
  async analyzeExports(targetUnits?: readonly string[]): Promise<readonly SourceAnalysisResult[]> {
    const targetFiles = await collectTargetFiles(targetUnits);
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
        unitName: resolveUnitName(filePath),
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

async function collectTargetFiles(targetUnits?: readonly string[]): Promise<readonly string[]> {
  const roots = targetUnits && targetUnits.length > 0
    ? targetUnits.map((unit) => join(HARNESS_ROOT, unit))
    : [HARNESS_ROOT];

  const files: string[] = [];
  for (const root of roots) {
    files.push(...await walkTsFiles(root));
  }

  return files;
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

function resolveUnitName(filePath: string): string {
  const relativePath = relative(HARNESS_ROOT, filePath);
  const [firstSegment] = relativePath.split(sep);
  return firstSegment || basename(filePath);
}
