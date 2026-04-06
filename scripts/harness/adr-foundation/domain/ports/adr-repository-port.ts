// @layer domain
import type { ADR } from '../aggregates/adr.js';
import type { AdrId } from '../value-objects/adr-id.js';
import type { AdrStatus } from '../value-objects/adr-status.js';

export interface AdrRepositoryPort {
  findById(id: AdrId): Promise<ADR | null>;
  findByRef(adrRef: string): Promise<ADR | null>;
  findAll(filters?: {
    statuses?: AdrStatus[];
    includeTemplate?: boolean;
  }): Promise<ADR[]>;
  save(adr: ADR): Promise<void>;
  exists(id: AdrId): Promise<boolean>;
  nextId(): Promise<AdrId>;
}
