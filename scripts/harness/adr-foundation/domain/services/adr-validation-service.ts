/**
 * @layer domain
 * @unit adr-foundation
 */
import { AdrBody, type AdrBodyProps } from '../value-objects/adr-body.js';
import {
  AdrFrontmatter,
  type AdrFrontmatterProps,
} from '../value-objects/adr-frontmatter.js';
import {
  ArchgateMapping,
  type ArchgateMappingProps,
} from '../value-objects/archgate-mapping.js';

export class AdrValidationService {
  validateFrontmatter(frontmatter: AdrFrontmatter | AdrFrontmatterProps): void {
    void (frontmatter instanceof AdrFrontmatter ? frontmatter : AdrFrontmatter.create(frontmatter));
  }

  validateBody(body: AdrBody | AdrBodyProps): void {
    void (body instanceof AdrBody ? body : AdrBody.create(body));
  }

  validateArchgate(mapping: ArchgateMapping | ArchgateMappingProps): void {
    void (mapping instanceof ArchgateMapping ? mapping : ArchgateMapping.create(mapping));
  }
}
