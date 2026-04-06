// @layer domain
import type { ADR } from '../aggregates/adr.js';
import type { AdrBody } from '../value-objects/adr-body.js';
import type { AdrFrontmatter } from '../value-objects/adr-frontmatter.js';

export interface AdrDocumentParserPort {
  parseDocument(rawMarkdown: string): {
    frontmatter: AdrFrontmatter;
    body: AdrBody;
  };
  serializeDocument(adr: ADR): string;
}
