// @unit ci-governance
// @layer infrastructure

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import type {
  FileScannerPort,
  FileScanOptions,
} from '../../domain/ports/file-scanner-port.js';

const require = createRequire(import.meta.url);
const picomatch = require('picomatch') as (
  pattern: string,
  options?: { dot?: boolean },
) => (p: string) => boolean;

const HARD_SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.phasegate',
]);

export class GlobFileScannerAdapter implements FileScannerPort {
  constructor(private readonly baseDir: string) {}

  async scan(options: FileScanOptions): Promise<readonly string[]> {
    const includeMatchers = options.include.map((p) =>
      picomatch(p, { dot: true }),
    );
    const excludeMatchers = options.exclude.map((p) =>
      picomatch(p, { dot: true }),
    );
    const collected: string[] = [];
    await this.walk(this.baseDir, '', includeMatchers, excludeMatchers, collected);
    return collected.sort();
  }

  private async walk(
    absDir: string,
    relDir: string,
    includeMatchers: Array<(p: string) => boolean>,
    excludeMatchers: Array<(p: string) => boolean>,
    out: string[],
  ): Promise<void> {
    let entries: Array<{
      name: string;
      isDirectory: () => boolean;
      isFile: () => boolean;
    }>;
    try {
      entries = (await fs.readdir(absDir, {
        withFileTypes: true,
      })) as unknown as typeof entries;
    } catch {
      return;
    }

    for (const ent of entries) {
      if (ent.isDirectory() && HARD_SKIP_DIRS.has(ent.name)) continue;
      const relPath = relDir === '' ? ent.name : `${relDir}/${ent.name}`;
      const absPath = path.join(absDir, ent.name);

      if (ent.isDirectory()) {
        await this.walk(absPath, relPath, includeMatchers, excludeMatchers, out);
        continue;
      }

      if (!ent.isFile()) continue;
      if (!includeMatchers.some((m) => m(relPath))) continue;
      if (excludeMatchers.some((m) => m(relPath))) continue;
      out.push(relPath);
    }
  }
}
