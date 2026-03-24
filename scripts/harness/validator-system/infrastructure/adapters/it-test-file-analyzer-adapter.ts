/**
 * @layer infrastructure
 * @unit validator-system
 *
 * ItTestFileAnalyzerAdapter — ItTestFileAnalyzerPort実装
 * ITテストファイルをテキストスキャンしてvi.mock呼び出しを検出する。
 */
import type { ItTestFileAnalyzerPort, ItTestMockCall } from '../../domain/ports/it-test-file-analyzer-port.js';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface ItTestFileAnalyzerAdapterOptions {
  readonly itTestRoot?: string;
  /** スキャン対象から除外するパスパターン */
  readonly excludePattern?: RegExp;
}

export class ItTestFileAnalyzerAdapter implements ItTestFileAnalyzerPort {
  private readonly itTestRoot: string | undefined;
  private readonly excludePattern: RegExp | undefined;

  constructor(options: ItTestFileAnalyzerAdapterOptions = {}) {
    this.itTestRoot = options.itTestRoot;
    this.excludePattern = options.excludePattern;
  }

  async findMockCallsInItTests(targetPaths?: readonly string[]): Promise<readonly ItTestMockCall[]> {
    const allFiles = targetPaths ? [...targetPaths] : await this.discoverItTestFiles();
    const files = this.excludePattern ? allFiles.filter((f) => !this.excludePattern!.test(f)) : allFiles;
    const results: ItTestMockCall[] = [];

    for (const filePath of files) {
      const calls = await this.scanFile(filePath);
      results.push(...calls);
    }

    return results;
  }

  private async discoverItTestFiles(): Promise<string[]> {
    if (!this.itTestRoot) return [];
    return this.findFiles(this.itTestRoot, /\.test\.ts$/);
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

  private async scanFile(filePath: string): Promise<ItTestMockCall[]> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return this.extractMockCalls(filePath, content);
    } catch {
      return [];
    }
  }

  private extractMockCalls(filePath: string, content: string): ItTestMockCall[] {
    const results: ItTestMockCall[] = [];
    // Match vi.mock('...') or vi.mock("...")
    const mockPattern = /vi\.mock\(['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = mockPattern.exec(content)) !== null) {
      results.push({ filePath, mockedModule: match[1] });
    }
    return results;
  }
}

// @story-id H08-07