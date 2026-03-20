/**
 * @layer infrastructure
 * @unit phase2-extensions
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PointerExtractorPort } from '../../domain/ports/pointer-extractor-port.js';
import { Pointer } from '../../domain/value-objects/pointer.js';

const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const RELATIVE_PATH_REGEX = /(?:^|\s)((?:docs|scripts)\/[^\s,'")\]]+)/gm;

function isUrlTarget(target: string): boolean {
  return target.startsWith('http://') || target.startsWith('https://');
}

export class RegexPointerExtractorAdapter implements PointerExtractorPort {
  constructor(private readonly projectRoot: string) {}

  async extract(documentPath: string): Promise<Pointer[]> {
    const content = await fs.readFile(path.resolve(this.projectRoot, documentPath), 'utf8');
    const pointers: Pointer[] = [];
    const seen = new Set<string>();

    for (const match of content.matchAll(MARKDOWN_LINK_REGEX)) {
      const rawText = match[0];
      const target = match[2]?.trim();
      if (!target) {
        continue;
      }
      const type = isUrlTarget(target) ? 'url' : 'file-path';
      const key = `${type}:${target}`;
      if (!seen.has(key)) {
        seen.add(key);
        pointers.push(Pointer.create({ type, rawText, target }));
      }
    }

    for (const match of content.matchAll(RELATIVE_PATH_REGEX)) {
      const target = match[1]?.trim();
      if (!target) {
        continue;
      }
      const key = `file-path:${target}`;
      if (!seen.has(key)) {
        seen.add(key);
        pointers.push(Pointer.create({ type: 'file-path', rawText: target, target }));
      }
    }

    return pointers;
  }
}
