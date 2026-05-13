/**
 * @layer infrastructure
 * @unit ci-governance
 * @work-item-id WI-174
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
  private lastReadContent: string | null = null;

  constructor(baseDir: string) {
    this.filePath = path.join(baseDir, 'AGENTS.md');
  }

  async read(): Promise<AgentsMdPointer> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.lastReadContent = content;
      return this.parseAgentsMd(content);
    } catch {
      this.lastReadContent = null;
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

    const content = this.serializeAgentsMd(pointer, this.lastReadContent ?? null);
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
      const cmdMatch = line.match(/^- \[cmd:([^\]]+)\]\(phasegate:([^)]+)\)\s*(.*)$/);
      if (cmdMatch) {
        try {
          pointers.push(PointerEntry.createCommand({
            key: cmdMatch[1].trim(),
            command: `phasegate:${cmdMatch[2].trim()}`,
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

  private serializeAgentsMd(pointer: AgentsMdPointer, existing: string | null): string {
    const section = this.serializeLessonPointerSection(pointer);
    if (existing !== null && existing.trim().length > 0) {
      const start = '<!-- phasegate:lesson-pointers:start -->';
      const end = '<!-- phasegate:lesson-pointers:end -->';
      const pattern = new RegExp(`${this.escapeRegExp(start)}[\\s\\S]*?${this.escapeRegExp(end)}`);
      if (pattern.test(existing)) {
        return existing.replace(pattern, section.trim()).replace(/\s*$/, '\n');
      }
      return `${existing.replace(/\s*$/, '\n\n')}${section}`;
    }
    return ['# AGENTS.md', '', section].join('\n');
  }

  private serializeLessonPointerSection(pointer: AgentsMdPointer): string {
    const lines: string[] = [
      '<!-- phasegate:lesson-pointers:start -->',
      '## PhaseGate Lesson Pointers',
      '',
    ];

    if (pointer.pointers.length > 0) {
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
      lines.push('### ADR Links', '');
      for (const adr of pointer.adrLinks) {
        lines.push(`- ADR: ${adr}`);
      }
      lines.push('');
    }

    lines.push('<!-- phasegate:lesson-pointers:end -->', '');
    return lines.join('\n');
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
