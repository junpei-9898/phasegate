/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * AgentsMdPort実装（AGENTS.mdファイルI/O）
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { AgentsMdPort, AgentsMdWriteResult } from '../../domain/ports/agents-md-port.js';
import { AgentsMdPointer } from '../../domain/aggregates/agents-md-pointer.js';
import { PointerEntry } from '../../domain/value-objects/pointer-entry.js';

export class AgentsMdFileAdapter implements AgentsMdPort {
  private readonly filePath: string;

  constructor(baseDir: string) {
    this.filePath = path.join(baseDir, 'AGENTS.md');
  }

  async read(): Promise<AgentsMdPointer> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return this.parseAgentsMd(content);
    } catch {
      return AgentsMdPointer.create();
    }
  }

  async write(pointer: AgentsMdPointer): Promise<AgentsMdWriteResult> {
    let before = 0;
    try {
      const existing = await fs.readFile(this.filePath, 'utf-8');
      before = existing.split('\n').length;
    } catch {
      before = 0;
    }

    const content = this.serializeAgentsMd(pointer);
    await fs.writeFile(this.filePath, content, 'utf-8');
    const after = content.split('\n').length;

    return { before, after };
  }

  private parseAgentsMd(content: string): AgentsMdPointer {
    // Simple parser - in real implementation would parse markdown structure
    const lines = content.split('\n');
    const pointers: PointerEntry[] = [];
    const adrLinks: string[] = [];

    for (const line of lines) {
      const cmdMatch = line.match(/^- \[cmd:([^\]]+)\]\(harness:([^)]+)\)\s*(.*)$/);
      if (cmdMatch) {
        try {
          pointers.push(PointerEntry.createCommand({
            key: cmdMatch[1].trim(),
            command: `harness:${cmdMatch[2].trim()}`,
            description: cmdMatch[3].trim(),
          }));
        } catch { /* skip invalid */ }
      }

      const fileMatch = line.match(/^- \[file:([^\]]+)\]\(([^)]+)\)\s*(.*)$/);
      if (fileMatch) {
        try {
          pointers.push(PointerEntry.createFile({
            key: fileMatch[1].trim(),
            filePath: fileMatch[2].trim(),
            description: fileMatch[3].trim(),
          }));
        } catch { /* skip invalid */ }
      }

      const adrMatch = line.match(/^- ADR: (.+)$/);
      if (adrMatch) {
        adrLinks.push(adrMatch[1].trim());
      }
    }

    return AgentsMdPointer.create(pointers, adrLinks);
  }

  private serializeAgentsMd(pointer: AgentsMdPointer): string {
    const lines: string[] = ['# AGENTS.md', ''];

    if (pointer.pointers.length > 0) {
      lines.push('## Pointers', '');
      for (const entry of pointer.pointers) {
        if (entry.isCommand()) {
          lines.push(`- [cmd:${entry.key}](${entry.command ?? ''}) ${entry.description}`);
        } else {
          lines.push(`- [file:${entry.key}](${entry.filePath ?? ''}) ${entry.description}`);
        }
      }
      lines.push('');
    }

    if (pointer.adrLinks.length > 0) {
      lines.push('## ADR Links', '');
      for (const adr of pointer.adrLinks) {
        lines.push(`- ADR: ${adr}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
