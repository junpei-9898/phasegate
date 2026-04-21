// @unit ci-governance
// @layer infrastructure

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { TemplateRepositoryPort } from '../../domain/ports/template-repository-port.js';
import type { DesignPhase } from '../../domain/value-objects/design-phase.js';

export class FileSystemTemplateRepositoryAdapter implements TemplateRepositoryPort {
  private readonly templatesDir: string;

  constructor(harnessRoot: string, subDir: string = 'templates') {
    this.templatesDir = path.isAbsolute(subDir)
      ? subDir
      : path.join(harnessRoot, subDir);
  }

  resolvePath(phase: DesignPhase): string {
    return path.join(this.templatesDir, phase.templateFileName);
  }

  async read(phase: DesignPhase): Promise<string> {
    const filePath = this.resolvePath(phase);
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(
          `テンプレートが見つかりません: ${filePath} (phase=${phase.value})`,
        );
      }
      throw err;
    }
  }
}
