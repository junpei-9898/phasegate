/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import type { FilePath } from '../../domain/value-objects/file-path.js';
import type { SourceModuleAnalyzerPort } from '../../domain/ports/source-module-analyzer-port.js';
import type { ArchitectureSpec } from '../../domain/value-objects/architecture-spec.js';
import { SourceModuleSnapshot } from '../../domain/value-objects/source-module-snapshot.js';
import { ImportEdge } from '../../domain/value-objects/import-edge.js';
import { FilePath as FilePathVO } from '../../domain/value-objects/file-path.js';
import { parseUnitComment } from '../parsers/unit-comment-parser.js';
import { parseLayerComment } from '../parsers/layer-comment-parser.js';
import { parseCommentDensity } from '../parsers/comment-density-parser.js';

export interface TypeScriptSourceModuleAnalyzerAdapterDeps {
  readonly rootDir: string;
}

const HARNESS_ROOT_PREFIX = 'scripts/harness/';
const TESTS_SEGMENT = '__tests__';
const TEST_SCOPE_SEGMENTS = new Set(['unit', 'integration', 'e2e']);

function deriveUnitNameFromPath(filePath: FilePath): string | null {
  const normalizedPath = filePath.toString();
  if (!normalizedPath.startsWith(HARNESS_ROOT_PREFIX)) {
    return null;
  }

  const parts = normalizedPath.slice(HARNESS_ROOT_PREFIX.length).split('/');
  if (parts.length < 2) {
    return null;
  }

  if (parts[0] !== TESTS_SEGMENT) {
    return parts[0] || null;
  }

  if (parts.length < 3) {
    return parts[1] || null;
  }

  if (TEST_SCOPE_SEGMENTS.has(parts[1])) {
    return parts[2] || null;
  }

  return parts[1] || null;
}

/**
 * SourceModuleAnalyzerPort の実装。
 * TypeScript Compiler API を使用して各ファイルから
 * import、@unit/@layer コメント、any型カウント、コメントメトリクス、export を抽出する。
 */
export class TypeScriptSourceModuleAnalyzerAdapter implements SourceModuleAnalyzerPort {
  private readonly rootDir: string;

  constructor(deps: TypeScriptSourceModuleAnalyzerAdapterDeps) {
    this.rootDir = deps.rootDir;
  }

  async analyzeMany(
    files: readonly FilePath[],
    architecture?: ArchitectureSpec
  ): Promise<readonly SourceModuleSnapshot[]> {
    const absolutePaths = files.map((f) => path.resolve(this.rootDir, f.toString()));

    const program = ts.createProgram(absolutePaths, {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.Node16,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      allowJs: false,
      noEmit: true,
    });

    const snapshots: SourceModuleSnapshot[] = [];

    for (const filePath of files) {
      const absolutePath = path.resolve(this.rootDir, filePath.toString());
      const sourceFile = program.getSourceFile(absolutePath);

      if (!sourceFile) {
        continue;
      }

      const sourceText = sourceFile.getFullText();
      const unitResult = parseUnitComment(sourceText, architecture?.metadataTags.unit);
      const layerResult = parseLayerComment(sourceText, architecture?.metadataTags.layer);
      const densityResult = parseCommentDensity(sourceText);
      const imports = this.extractImports(sourceFile, filePath);
      const anyCount = this.countAnyTypes(sourceFile);
      const typedCount = this.countTypedNodes(sourceFile);
      const exports = this.extractExports(sourceFile);
      const isEntrypoint = this.isEntrypointCandidate(filePath);

      snapshots.push(
        SourceModuleSnapshot.create(
          {
            filePath,
            declaredUnit: unitResult.unitNames[0] ?? deriveUnitNameFromPath(filePath),
            declaredLayer: layerResult.layerName,
            imports,
            anyTypeCount: anyCount,
            typedNodeCount: typedCount,
            commentLineCount: densityResult.commentLineCount,
            logicalLineCount: densityResult.logicalLineCount,
            repeatedCommentBlocks: densityResult.repeatedCommentBlocks,
            duplicationFingerprints: [],
            exportedSymbols: exports,
            isEntrypointCandidate: isEntrypoint,
          },
          architecture
        )
      );
    }

    return Object.freeze(snapshots);
  }

  private extractImports(sourceFile: ts.SourceFile, fromFile: FilePath): ImportEdge[] {
    const edges: ImportEdge[] = [];
    const fromDir = path.dirname(path.resolve(this.rootDir, fromFile.toString()));

    const pushEdge = (specifier: string, importKind: 'value' | 'type' | 'dynamic'): void => {
      if (!specifier.startsWith('.')) {
        return;
      }

      const resolved = path.resolve(fromDir, specifier.replace(/\.js$/, '.ts'));
      const relative = path.relative(this.rootDir, resolved);

      if (relative.startsWith('..')) {
        return;
      }

      try {
        edges.push(
          ImportEdge.create({
            from: fromFile,
            to: FilePathVO.fromWorkspaceRelative(relative),
            importKind,
          })
        );
      } catch {
        // invalid path — skip
      }
    };

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const importKind =
          node.importClause?.isTypeOnly === true ? 'type' as const : 'value' as const;
        pushEdge(node.moduleSpecifier.text, importKind);
      }

      if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier !== undefined &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const importKind = node.isTypeOnly === true ? 'type' as const : 'value' as const;
        pushEdge(node.moduleSpecifier.text, importKind);
      }

      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length > 0 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        pushEdge(node.arguments[0].text, 'dynamic');
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);

    return edges;
  }

  private countAnyTypes(sourceFile: ts.SourceFile): number {
    let count = 0;

    const visit = (node: ts.Node): void => {
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        count += 1;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return count;
  }

  private countTypedNodes(sourceFile: ts.SourceFile): number {
    let count = 0;

    const visit = (node: ts.Node): void => {
      if (
        ts.isTypeReferenceNode(node) ||
        ts.isTypeLiteralNode(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        node.kind === ts.SyntaxKind.AnyKeyword ||
        node.kind === ts.SyntaxKind.NumberKeyword ||
        node.kind === ts.SyntaxKind.StringKeyword ||
        node.kind === ts.SyntaxKind.BooleanKeyword ||
        node.kind === ts.SyntaxKind.VoidKeyword
      ) {
        count += 1;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return count;
  }

  private extractExports(sourceFile: ts.SourceFile): string[] {
    const exports: string[] = [];

    ts.forEachChild(sourceFile, (node) => {
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      const hasExport = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

      if (!hasExport) {
        return;
      }

      if (ts.isFunctionDeclaration(node) && node.name) {
        exports.push(node.name.text);
      } else if (ts.isClassDeclaration(node) && node.name) {
        exports.push(node.name.text);
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exports.push(decl.name.text);
          }
        }
      } else if (ts.isTypeAliasDeclaration(node)) {
        exports.push(node.name.text);
      } else if (ts.isInterfaceDeclaration(node)) {
        exports.push(node.name.text);
      }
    });

    return exports;
  }

  private isEntrypointCandidate(filePath: FilePath): boolean {
    const fileName = filePath.fileName();

    return fileName === 'index.ts' || filePath.segments().includes('cli');
  }
}
