// @unit ci-governance
// @layer infrastructure

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { BaselineRepositoryPort } from '../../domain/ports/baseline-repository-port.js';
import { BaselineSnapshot } from '../../domain/value-objects/baseline-snapshot.js';
import { BaselineEntry } from '../../domain/value-objects/baseline-entry.js';

interface BaselineJsonV1 {
  readonly version: '1.0';
  readonly createdAt: string;
  readonly algorithm: 'sha1';
  readonly files: ReadonlyArray<{ readonly path: string; readonly sha1: string }>;
}

export class BaselineJsonRepositoryAdapter implements BaselineRepositoryPort {
  private readonly filePath: string;

  constructor(baseDir: string, relativePath = '.phasegate/baseline.json') {
    this.filePath = path.isAbsolute(relativePath)
      ? relativePath
      : path.join(baseDir, relativePath);
  }

  getPath(): string {
    return this.filePath;
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  async save(snapshot: BaselineSnapshot): Promise<string> {
    const data: BaselineJsonV1 = {
      version: '1.0',
      createdAt: snapshot.createdAt,
      algorithm: snapshot.algorithm,
      files: snapshot.entries.map((e) => ({ path: e.path, sha1: e.sha1 })),
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(
      this.filePath,
      `${JSON.stringify(data, null, 2)}\n`,
      'utf-8',
    );
    return this.filePath;
  }

  async load(): Promise<BaselineSnapshot | null> {
    let content: string;
    try {
      content = await fs.readFile(this.filePath, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }

    let parsed: BaselineJsonV1;
    try {
      parsed = JSON.parse(content) as BaselineJsonV1;
    } catch (err) {
      throw new Error(
        `Invalid baseline JSON at ${this.filePath}: ${String(err)}`,
      );
    }

    if (
      !parsed ||
      parsed.version !== '1.0' ||
      parsed.algorithm !== 'sha1' ||
      !Array.isArray(parsed.files)
    ) {
      throw new Error(`Invalid baseline JSON schema at ${this.filePath}`);
    }

    const entries = parsed.files.map((f) =>
      BaselineEntry.create({ path: f.path, sha1: f.sha1 }),
    );
    return BaselineSnapshot.create({
      createdAt: parsed.createdAt,
      algorithm: parsed.algorithm,
      entries,
    });
  }
}
