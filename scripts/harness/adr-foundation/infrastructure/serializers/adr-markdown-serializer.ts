/**
 * @layer infrastructure
 * @unit adr-foundation
 */
import type { ADR } from '../../domain/aggregates/adr.js';

export function toAsciiKebabCase(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug.length > 0 ? slug : 'untitled';
}

export class AdrMarkdownSerializer {
  serialize(adr: ADR): string {
    const title = adr.getFrontmatter().title;
    const sections = adr.getBody().toSectionMap();

    const lines: string[] = [`# ${title}`];

    const canonicalOrder: Array<'Context' | 'Decision' | 'Consequences' | 'Alternatives'> = [
      'Context',
      'Decision',
      'Consequences',
      'Alternatives',
    ];

    for (const sectionName of canonicalOrder) {
      const content = sections[sectionName];
      if (content !== undefined) {
        lines.push('', `## ${sectionName}`, '', content);
      }
    }

    return lines.join('\n') + '\n';
  }
}
