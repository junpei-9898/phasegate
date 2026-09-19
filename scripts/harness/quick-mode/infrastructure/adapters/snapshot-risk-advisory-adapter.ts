// @unit quick-mode
// @layer infrastructure
// @work-item-id WI-220
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type * as TypeScript from 'typescript';
import type { ChangeRiskAdvice, ChangeRiskAdvisoryPort } from '../../application/ports/change-risk-advisory-port.js';

interface Snapshot {
  filePath: string;
  beforeContent: string | null;
  afterContent: string | null;
}

function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.filePath === 'string' && item.filePath.length > 0
    && (typeof item.beforeContent === 'string' || item.beforeContent === null)
    && (typeof item.afterContent === 'string' || item.afterContent === null);
}

function hash(content: string | null): string | null {
  return content === null ? null : createHash('sha256').update(content).digest('hex');
}

function classSurface(ts: typeof TypeScript, declaration: TypeScript.ClassDeclaration): TypeScript.ClassDeclaration | null {
  const decorated = (node: TypeScript.Node) => ts.canHaveDecorators(node) && (ts.getDecorators(node)?.length ?? 0) > 0;
  if (decorated(declaration)) return null;
  const members: TypeScript.ClassElement[] = [];
  for (const member of declaration.members) {
    if (decorated(member)) return null;
    if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
      if (member.parameters.some(parameter => !parameter.type || parameter.initializer || decorated(parameter))) return null;
      if (ts.isMethodDeclaration(member)) {
        if (!member.type || member.asteriskToken) return null;
        members.push(ts.factory.updateMethodDeclaration(member, member.modifiers, member.asteriskToken,
          member.name, member.questionToken, member.typeParameters, member.parameters, member.type, undefined));
      } else members.push(ts.factory.updateConstructorDeclaration(member, member.modifiers, member.parameters, undefined));
    } else if (ts.isPropertyDeclaration(member)) {
      if (!member.type) return null;
      members.push(ts.factory.updatePropertyDeclaration(member, member.modifiers, member.name,
        member.questionToken ?? member.exclamationToken, member.type, undefined));
    } else return null;
  }
  return ts.factory.updateClassDeclaration(declaration, declaration.modifiers, declaration.name,
    declaration.typeParameters, declaration.heritageClauses, members);
}

// A deliberately bounded module-surface observation, not an API or behavior proof.
function surface(ts: typeof TypeScript, path: string, content: string): string | null {
  const diagnostics = ts.transpileModule(content, { fileName: path, reportDiagnostics: true }).diagnostics ?? [];
  if (diagnostics.some((item) => item.category === ts.DiagnosticCategory.Error)) return null;
  const file = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({ removeComments: true });
  const declarations: string[] = [];
  for (const statement of file.statements) {
    if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) return null;
    const exported = ts.canHaveModifiers(statement)
      && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    let declaration: TypeScript.Node = statement;
    if (ts.isFunctionDeclaration(statement)) {
      if (!statement.type || statement.parameters.some((parameter) => !parameter.type || parameter.initializer)
        || statement.asteriskToken) return null;
      declaration = ts.factory.updateFunctionDeclaration(statement, statement.modifiers, statement.asteriskToken,
        statement.name, statement.typeParameters, statement.parameters, statement.type, undefined);
    } else if (ts.isClassDeclaration(statement)) {
      const observed = classSurface(ts, statement);
      if (observed === null) return null;
      declaration = observed;
    } else if (!ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement)) {
      return null;
    }
    declarations.push(printer.printNode(ts.EmitHint.Unspecified, declaration, file));
  }
  return declarations.join('\n');
}

export class SnapshotRiskAdvisoryAdapter implements ChangeRiskAdvisoryPort {
  constructor(private readonly rootDir: string = process.cwd()) {}

  async assess(paths: readonly string[], snapshotFile: string): Promise<readonly ChangeRiskAdvice[]> {
    const raw: unknown = JSON.parse(await readFile(resolve(this.rootDir, snapshotFile), 'utf8'));
    if (!Array.isArray(raw) || !raw.every(isSnapshot)) {
      throw new Error('Risk snapshots must be an array of { filePath, beforeContent: string|null, afterContent: string|null }.');
    }
    // No TypeScript runtime loading or source parsing occurs on the default classification path.
    const ts = await import('typescript');
    return paths.map((path) => {
      const matches = raw.filter((snapshot) => snapshot.filePath === path);
      const snapshot = matches.length === 1 ? matches[0] : undefined;
      const before = snapshot?.beforeContent ?? null;
      const after = snapshot?.afterContent ?? null;
      const base = { path, source: 'caller-snapshot' as const, enforcement: 'none' as const,
        beforeHash: hash(before), afterHash: hash(after) };
      if (!snapshot || before === null || after === null) {
        return { ...base, kind: 'unknown', reason: 'Missing, duplicate, creation or deletion snapshot: inspect the actual revision and affected contracts.' };
      }
      if (before === after) {
        return { ...base, kind: 'no-content-change', reason: 'Only the supplied snapshots are identical; this is not approval or verification of the current revision.' };
      }
      if (!/\.[cm]?tsx?$/.test(path) || /\.d\.[cm]?ts$/.test(path)) {
        return { ...base, kind: 'unknown', reason: 'Unsupported source language: inspect the contract and behavior changes.' };
      }
      const beforeSurface = surface(ts, path, before);
      const afterSurface = surface(ts, path, after);
      if (beforeSurface === null || afterSurface === null) {
        return { ...base, kind: 'unknown', reason: 'Invalid or unsupported declaration: inspect exported contracts, authorization, invariants and persisted formats.' };
      }
      if (beforeSurface !== afterSurface) {
        return { ...base, kind: 'module-surface-change', reason: 'Declared module surface changed. Confirm public consumers and escalate changes to agreed contracts before dependent work.' };
      }
      return { ...base, kind: 'behavior-review', reason: 'Declared module surface is unchanged, but behavior equivalence is unproven. Review authorization, business invariants and persisted formats; internal extraction is not automatically approved.' };
    });
  }
}
