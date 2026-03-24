/**
 * @layer infrastructure
 * @unit validator-system
 *
 * SourceFileTextScannerAdapter — SourceFileTextScannerPort実装
 * ソースファイルをテキストスキャンしてパターンに一致する行を返す。
 */
import type { SourceFileTextScannerPort, TextScanMatch } from '../../domain/ports/source-file-text-scanner-port.js';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface SourceFileTextScannerAdapterOptions {
  readonly sourceRoot?: string;
  readonly filePattern?: RegExp;
  /** スキャン対象から除外するパスパターン（デフォルト: テストディレクトリを除外） */
  readonly excludePattern?: RegExp;
}

export class SourceFileTextScannerAdapter implements SourceFileTextScannerPort {
  private readonly sourceRoot: string | undefined;
  private readonly filePattern: RegExp;
  private readonly excludePattern: RegExp;

  constructor(options: SourceFileTextScannerAdapterOptions = {}) {
    this.sourceRoot = options.sourceRoot;
    this.filePattern = options.filePattern ?? /\.(ts|js)$/;
    this.excludePattern = options.excludePattern ?? /__tests__\//;
  }

  async scanForPattern(pattern: RegExp, targetPaths?: readonly string[]): Promise<readonly TextScanMatch[]> {
    const allFiles = targetPaths ? [...targetPaths] : await this.discoverSourceFiles();
    const files = allFiles.filter((f) => !this.excludePattern.test(f));
    const results: TextScanMatch[] = [];

    for (const filePath of files) {
      const matches = await this.scanFile(filePath, pattern);
      results.push(...matches);
    }

    return results;
  }

  private async discoverSourceFiles(): Promise<string[]> {
    if (!this.sourceRoot) return [];
    return this.findFiles(this.sourceRoot, this.filePattern);
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

  private async scanFile(filePath: string, pattern: RegExp): Promise<TextScanMatch[]> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split(/\r?\n/);
      const matches: TextScanMatch[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          matches.push({
            filePath,
            lineNumber: i + 1,
            lineContent: lines[i],
          });
        }
      }

      return matches;
    } catch {
      return [];
    }
  }
}

// @story-id H08-07