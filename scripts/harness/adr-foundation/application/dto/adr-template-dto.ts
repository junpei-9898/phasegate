/**
 * @layer application
 * @unit adr-foundation
 */
import type { ArchgateMappingDto } from './adr-detail-dto.js';

export interface AdrTemplateFrontmatterDefaultsDto {
  readonly adrId: string;
  readonly title: string;
  readonly status: string;
  readonly date: string;
  readonly archgate?: ArchgateMappingDto;
}

export interface AdrTemplateDto {
  readonly adrRef: string;
  readonly filePath: string;
  readonly recommendedPath: string;
  readonly markdown: string;
  readonly frontmatterDefaults: AdrTemplateFrontmatterDefaultsDto;
}
