/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';
import type { FilePath } from '../../domain/value-objects/file-path.js';
import { FilePath as FilePathVO } from '../../domain/value-objects/file-path.js';
import type { WorkspaceFilePort } from '../../domain/ports/workspace-file-port.js';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'coverage', '__fixtures__']);

export interface NodeWorkspaceFileAdapterDeps {
  readonly rootDir: string;
}

/**
 * WorkspaceFilePort の実装。
 * scripts/harness/ 配下の .ts/.tsx/.mts/.cts ファイルを列挙する。
 * node_modules, dist, coverage, __fixtures__ は除外する。
 */
export class NodeWorkspaceFileAdapter implements WorkspaceFilePort {
  private readonly rootDir: string;

  constructor(deps: NodeWorkspaceFileAdapterDeps) {
    this.rootDir = deps.rootDir;
  }

  async listSourceFiles(targets?: readonly string[]): Promise<readonly FilePath[]> {
    const baseDir = targets && targets.length > 0
      ? targets[0]
      : 'scripts/harness';

    const absoluteBase = path.resolve(this.rootDir, baseDir);

    if (!fs.existsSync(absoluteBase)) {
      return Object.freeze([]);
    }

    const results: FilePath[] = [];
    await this.walkDirectory(absoluteBase, results);

    return Object.freeze(results);
  }

  async readText(filePath: FilePath): Promise<string> {
    const absolutePath = path.resolve(this.rootDir, filePath.toString());

    return readFile(absolutePath, 'utf8');
  }

  async exists(filePath: FilePath): Promise<boolean> {
    const absolutePath = path.resolve(this.rootDir, filePath.toString());

    return fs.existsSync(absolutePath);
  }

  private async walkDirectory(dir: string, results: FilePath[]): Promise<void> {
    const entries = await readdir(dir);

    for (const entry of entries) {
      if (EXCLUDED_DIRS.has(entry)) {
        continue;
      }

      const fullPath = path.join(dir, entry);
      const fileStat = await stat(fullPath);

      if (fileStat.isDirectory()) {
        await this.walkDirectory(fullPath, results);
        continue;
      }

      const ext = path.extname(entry);

      if (!SOURCE_EXTENSIONS.has(ext)) {
        continue;
      }

      const relative = path.relative(this.rootDir, fullPath);

      try {
        results.push(FilePathVO.fromWorkspaceRelative(relative));
      } catch {
        // invalid path — skip
      }
    }
  }
}
