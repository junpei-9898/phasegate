import type { AdrFrontmatter } from '../value-objects/adr-frontmatter.js';

export interface AdrFrontmatterParserPort {
  parseFrontmatter(raw: string): AdrFrontmatter;
  serializeFrontmatter(frontmatter: AdrFrontmatter): string;
}
