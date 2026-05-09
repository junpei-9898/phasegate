/**
 * @layer infrastructure
 * @unit validator-system
 *
 * E2eTestFileRegistryAdapter — E2eTestFileRegistryPort実装
 * E2Eテストファイルのパス一覧を提供する。
 */
import type { E2eTestFileRegistryPort } from '../../domain/ports/e2e-test-file-registry-port.js';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface E2eTestFileRegistryAdapterOptions {
  readonly e2eTestRoot?: string;
}

export class E2eTestFileRegistryAdapter implements E2eTestFileRegistryPort {
  private readonly e2eTestRoot: string | undefined;

  constructor(options: E2eTestFileRegistryAdapterOptions = {}) {
    this.e2eTestRoot = options.e2eTestRoot;
  }

  async getE2eTestFiles(): Promise<readonly string[]> {
    if (!this.e2eTestRoot) return [];
    const filePaths = await this.findFiles(this.e2eTestRoot, /\.test\.ts$/);
    const contents: string[] = [];
    for (const filePath of filePaths) {
      try {
        contents.push(`${filePath}\n${await readFile(filePath, 'utf-8')}`);
      } catch {
        contents.push(filePath);
      }
    }
    return contents;
  }

  private async findFiles(dir: string, pattern: RegExp): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          const nested = await this.findFiles(fullPath, pattern);
          results.push(...nested);
        } else if (pattern.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch {
      // directory not accessible
    }
    return results;
  }
}

// @story-id H08-07
