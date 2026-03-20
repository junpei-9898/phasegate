/**
 * @layer application
 * @unit adr-foundation
 */
import type { ADR } from '../../domain/aggregates/adr.js';
import type { AdrListItemDto } from '../dto/adr-list-item-dto.js';

export function toAdrListItemDto(adr: ADR): Readonly<AdrListItemDto> {
  const frontmatter = adr.getFrontmatter();

  return Object.freeze({
    adrRef: adr.toAdrRef(),
    title: frontmatter.title,
    status: frontmatter.status.value,
    date: frontmatter.date,
    hasArchgate: adr.getArchgate() !== undefined,
    supersededBy: frontmatter.superseded_by,
  });
}
