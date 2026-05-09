/**
 * @layer infrastructure
 * @unit ci-governance
 */

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AgentContextDocumentPort, AgentContextDocumentStat } from '../../domain/ports/agent-context-document-port.js';

export class AgentContextFileAdapter implements AgentContextDocumentPort {
  constructor(
    private readonly projectRoot: string,
    private readonly harnessRoot: string,
  ) {}

  async readProjectFile(relativePath: string): Promise<string | null> {
    try {
      return await readFile(join(this.projectRoot, relativePath), 'utf-8');
    } catch {
      return null;
    }
  }

  async writeProjectFile(relativePath: string, content: string): Promise<void> {
    const targetPath = join(this.projectRoot, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, 'utf-8');
  }

  async readHarnessTemplate(relativePath: string): Promise<string> {
    return await readFile(join(this.harnessRoot, relativePath), 'utf-8');
  }

  async statProjectFile(relativePath: string): Promise<AgentContextDocumentStat> {
    try {
      const fileStat = await stat(join(this.projectRoot, relativePath));
      const ageInDays = Math.floor((Date.now() - fileStat.mtime.getTime()) / 86_400_000);
      return { exists: true, ageInDays };
    } catch {
      return { exists: false, ageInDays: null };
    }
  }

  async listHarnessSkillNames(): Promise<string[]> {
    try {
      const entries = await readdir(join(this.harnessRoot, 'skills'), { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch {
      return [];
    }
  }
}
