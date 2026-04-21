// @unit ci-governance
// @layer infrastructure

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { DesignDocWriterPort } from '../../domain/ports/design-doc-writer-port.js';
import type { DesignPhase } from '../../domain/value-objects/design-phase.js';

export class FileSystemDesignDocWriterAdapter implements DesignDocWriterPort {
  private readonly baseDir: string;
  private readonly constructionDir: string;

  constructor(
    baseDir: string,
    constructionSubDir: string = path.join('docs', 'product', 'construction'),
  ) {
    this.baseDir = baseDir;
    this.constructionDir = path.isAbsolute(constructionSubDir)
      ? constructionSubDir
      : path.join(baseDir, constructionSubDir);
  }

  resolvePath(unit: string, phase: DesignPhase): string {
    return path.join(this.constructionDir, unit, phase.designDocFileName);
  }

  async exists(unit: string, phase: DesignPhase): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(unit, phase));
      return true;
    } catch {
      return false;
    }
  }

  async write(unit: string, phase: DesignPhase, content: string): Promise<string> {
    const targetPath = this.resolvePath(unit, phase);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, 'utf-8');
    return targetPath;
  }
}
