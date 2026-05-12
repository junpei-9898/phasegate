/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-119
 *
 * ImportGraphSourceAnalysisAdapter — SourceAnalysisPort実装
 */
import type { SourceAnalysisPort, ImportGraphData } from '../../domain/ports/source-analysis-port.js';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';

const HARNESS_ROOT = join(process.cwd(), 'scripts', 'harness');
const IMPORT_PATTERN = /import\s+(?:type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT_PATTERN = /import\s+['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_PATTERN = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const RE_EXPORT_NAMED_PATTERN = /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
const RE_EXPORT_ALL_PATTERN = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
const EXPORT_PATTERN = /export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type|function|const|let|var|enum)\s+(\w+)/g;
const EXPORT_LIST_PATTERN = /export\s+(?:type\s+)?\{([^}]+)\}/g;

export class ImportGraphSourceAnalysisAdapter implements SourceAnalysisPort {
  private readonly root: string;
  private readonly includeExcludedFiles: boolean;

  constructor(root: string = HARNESS_ROOT, options: { includeExcludedFiles?: boolean } = {}) {
    this.root = root;
    this.includeExcludedFiles = options.includeExcludedFiles ?? false;
  }

  async getImportGraph(): Promise<ImportGraphData> {
    const filePaths = await walkTsFiles(this.root);
    const fileSet = new Set(filePaths.map((filePath) => normalize(filePath)));
    const nodes: Array<{ filePath: string; exports: readonly string[]; excludedReason?: string }> = [];
    const edges: Array<{ from: string; to: string; importedNames: readonly string[]; kind: string }> = [];

    for (const filePath of filePaths) {
      try {
        const content = await readFile(filePath, 'utf8');
        const exports = extractExports(content);
        const excludedReason = this.includeExcludedFiles ? undefined : classifyDeadCodeExclusion(filePath);
        nodes.push({
          filePath,
          exports,
          ...(excludedReason ? { excludedReason } : {}),
        });

        for (const match of content.matchAll(IMPORT_PATTERN)) {
          const target = resolveImportTarget(filePath, match[2] ?? '', fileSet);
          if (!target) continue;
          edges.push({
            from: filePath,
            to: target,
            importedNames: normalizeImportNames(match[1] ?? ''),
            kind: 'static-import',
          });
        }
        for (const match of content.matchAll(SIDE_EFFECT_IMPORT_PATTERN)) {
          const target = resolveImportTarget(filePath, match[1] ?? '', fileSet);
          if (!target) continue;
          edges.push({ from: filePath, to: target, importedNames: ['*'], kind: 'side-effect-import' });
        }
        for (const match of content.matchAll(DYNAMIC_IMPORT_PATTERN)) {
          const target = resolveImportTarget(filePath, match[1] ?? '', fileSet);
          if (!target) continue;
          edges.push({ from: filePath, to: target, importedNames: ['*'], kind: 'dynamic-import' });
        }
        for (const match of content.matchAll(RE_EXPORT_NAMED_PATTERN)) {
          const target = resolveImportTarget(filePath, match[2] ?? '', fileSet);
          if (!target) continue;
          edges.push({
            from: filePath,
            to: target,
            importedNames: normalizeImportNames(match[1] ?? ''),
            kind: 're-export',
          });
        }
        for (const match of content.matchAll(RE_EXPORT_ALL_PATTERN)) {
          const target = resolveImportTarget(filePath, match[1] ?? '', fileSet);
          if (!target) continue;
          edges.push({ from: filePath, to: target, importedNames: ['*'], kind: 're-export-all' });
        }
      } catch {
        continue;
      }
    }

    return { nodes, edges, unusedExports: detectUnusedExports(nodes, edges), unreachableCode: [] };
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

function normalizeImportNames(clause: string): string[] {
  const cleaned = clause
    .replace(/\btype\s+/g, '')
    .replace(/\s+as\s+\w+/g, '')
    .replace(/\*\s+as\s+(\w+)/g, '*')
    .replace(/[{}]/g, ',');

  return cleaned
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function extractExports(content: string): string[] {
  const names = new Set<string>();
  for (const match of content.matchAll(EXPORT_PATTERN)) {
    if (match[1]) names.add(match[1]);
  }
  for (const match of content.matchAll(EXPORT_LIST_PATTERN)) {
    for (const name of normalizeImportNames(match[1] ?? '')) {
      const [exportName] = name.split(/\s+as\s+/).map((part) => part.trim()).reverse();
      if (exportName) names.add(exportName);
    }
  }
  if (/export\s+default\b/.test(content)) {
    names.add('default');
  }
  return [...names];
}

function resolveImportTarget(fromFile: string, specifier: string, fileSet: ReadonlySet<string>): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), specifier);
  const candidates = extname(base)
    ? [base]
    : [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')];
  for (const candidate of candidates) {
    const normalized = normalize(candidate);
    if (fileSet.has(normalized)) return normalized;
  }
  return null;
}

function classifyDeadCodeExclusion(filePath: string): string | undefined {
  const normalized = filePath.replaceAll('\\', '/');
  if (/(^|\/)__tests__\//.test(normalized) || /\.test\.ts$/.test(normalized) || /\.it\.test\.ts$/.test(normalized)) {
    return 'test';
  }
  if (/(^|\/)fixtures?\//.test(normalized)) return 'fixture';
  if (/(^|\/)(templates|generated)\//.test(normalized)) return 'generated';
  if (/\/(index|main)\.ts$/.test(normalized) || /\/bin\//.test(normalized) || /\/presentation\/(cli|handlers)\//.test(normalized)) {
    return 'entrypoint';
  }
  return undefined;
}

function detectUnusedExports(
  nodes: readonly { filePath: string; exports: readonly string[]; excludedReason?: string }[],
  edges: readonly { to: string; importedNames: readonly string[] }[],
): string[] {
  const usedByFile = new Map<string, Set<string>>();
  for (const edge of edges) {
    const names = usedByFile.get(edge.to) ?? new Set<string>();
    for (const importedName of edge.importedNames) {
      names.add(importedName);
    }
    usedByFile.set(edge.to, names);
  }

  const unused: string[] = [];
  for (const node of nodes) {
    if (node.excludedReason) continue;
    const used = usedByFile.get(normalize(node.filePath)) ?? new Set<string>();
    for (const exportName of node.exports) {
      if (used.has('*') || used.has(exportName)) continue;
      unused.push(`${node.filePath}::${exportName} (reason: no import/export graph reference)`);
    }
  }
  return unused;
}
