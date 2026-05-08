/**
 * @layer infrastructure
 * @unit phase2-extensions
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PointerExtractorPort } from '../../domain/ports/pointer-extractor-port.js';
import { Pointer } from '../../domain/value-objects/pointer.js';

const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const RELATIVE_PATH_REGEX = /(?:^|\s)((?:docs|scripts)\/[^\s,'"`")\]）]+)/gm;

function isUrlTarget(target: string): boolean {
  return target.startsWith('http://') || target.startsWith('https://');
}

function hasFileExtension(target: string): boolean {
  return /\.[A-Za-z0-9]+$/u.test(path.posix.basename(target));
}

function normalizeFileTarget(documentPath: string, rawTarget: string): string | null {
  const withoutFragment = rawTarget.split('#')[0] ?? '';
  const cleaned = withoutFragment
    .replace(/^`+|`+$/g, '')
    .replace(/（.*$/u, '')
    .replace(/:\d+$/u, '')
    .replace(/[.,;:]+$/g, '')
    .trim();

  if (cleaned.length === 0) return null;
  if (cleaned.includes('{') || cleaned.includes('}') || cleaned.includes('*') || cleaned.includes('...')) return null;
  if (/[^\x00-\x7F]/u.test(cleaned)) return null;
  if (cleaned.startsWith('/')) return path.posix.normalize(cleaned);
  if (cleaned.startsWith('docs/') || cleaned.startsWith('scripts/')) return path.posix.normalize(cleaned);
  if (!cleaned.includes('/') && !hasFileExtension(cleaned)) return null;
  if (cleaned.startsWith('./') || cleaned.startsWith('../') || !cleaned.includes('/')) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(documentPath), cleaned));
  }

  return path.posix.normalize(cleaned);
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
      const normalizedTarget = type === 'url' ? target : normalizeFileTarget(documentPath, target);
      if (!normalizedTarget) {
        continue;
      }
      const key = `${type}:${normalizedTarget}`;
      if (!seen.has(key)) {
        seen.add(key);
        pointers.push(Pointer.create({ type, rawText, target: normalizedTarget }));
      }
    }

    for (const match of content.matchAll(RELATIVE_PATH_REGEX)) {
      const rawTarget = match[1]?.trim();
      const target = rawTarget ? normalizeFileTarget(documentPath, rawTarget) : null;
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
