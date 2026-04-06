// @layer infrastructure
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { V0TestId } from '../../domain/value-objects/v0-test-id.js';
import type { V0SpecReaderPort } from '../../domain/ports/v0-spec-reader-port.js';

export class FileSystemV0SpecReaderAdapter implements V0SpecReaderPort {
  constructor(private readonly baseDir: string) {}

  async readAll(): Promise<V0TestId[]> {
    try {
      const entries = await fs.readdir(this.baseDir, { recursive: true });
      const testFiles = entries
        .filter((entry) => typeof entry === 'string' && entry.endsWith('.test.ts'))
        .map((entry) => V0TestId.create(path.join(this.baseDir, entry as string)));
      return testFiles;
    } catch (err) {
      throw new Error(`V0SpecReadError: Failed to read directory '${this.baseDir}': ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
