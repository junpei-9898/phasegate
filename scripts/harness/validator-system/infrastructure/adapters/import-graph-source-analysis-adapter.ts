/**
 * @layer infrastructure
 * @unit validator-system
 *
 * ImportGraphSourceAnalysisAdapter — SourceAnalysisPort実装
 */
import type { SourceAnalysisPort, ImportGraphData } from '../../domain/ports/source-analysis-port.js';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const HARNESS_ROOT = join(process.cwd(), 'scripts', 'harness');
const IMPORT_PATTERN = /import\s+(?:type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"]/g;
const EXPORT_PATTERN = /export\s+(?:class|interface|type|function|const)\s+(\w+)/g;

export class ImportGraphSourceAnalysisAdapter implements SourceAnalysisPort {
  async getImportGraph(): Promise<ImportGraphData> {
    const filePaths = await walkTsFiles(HARNESS_ROOT);
    const nodes: Array<{ filePath: string; exports: readonly string[] }> = [];
    const edges: Array<{ from: string; to: string; importedNames: readonly string[] }> = [];

    for (const filePath of filePaths) {
      try {
        const content = await readFile(filePath, 'utf8');
        nodes.push({
          filePath,
          exports: Array.from(content.matchAll(EXPORT_PATTERN), (match) => match[1]),
        });

        for (const match of content.matchAll(IMPORT_PATTERN)) {
          edges.push({
            from: filePath,
            to: match[2],
            importedNames: normalizeImportNames(match[1] ?? ''),
          });
        }
      } catch {
        continue;
      }
    }

    return { nodes, edges, unusedExports: [], unreachableCode: [] };
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
    .replace(/[{}]/g, ',');

  return cleaned
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
