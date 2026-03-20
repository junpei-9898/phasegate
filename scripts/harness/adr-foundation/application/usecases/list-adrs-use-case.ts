/**
 * @layer application
 * @unit adr-foundation
 */
import { AdrStatus } from '../../domain/value-objects/adr-status.js';
import type { AdrRepositoryPort } from '../../domain/ports/adr-repository-port.js';
import type { AdrListItemDto } from '../dto/adr-list-item-dto.js';
import type { AdrListSummaryDto } from '../dto/adr-list-summary-dto.js';
import { toAdrListItemDto } from '../mappers/adr-to-list-item-dto-mapper.js';

export interface ListAdrsInput {
  readonly statuses?: Array<'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded'>;
}

export interface ListAdrsOutput {
  readonly items: readonly AdrListItemDto[];
  readonly summary: AdrListSummaryDto;
}

export class ListAdrsUseCase {
  constructor(private readonly adrRepository: AdrRepositoryPort) {}

  async execute(input: ListAdrsInput): Promise<Readonly<ListAdrsOutput>> {
    const statuses = input.statuses?.map((status) => AdrStatus.create(status));
    const adrs = await this.adrRepository.findAll({ statuses });
    const items = Object.freeze(adrs.map((adr) => toAdrListItemDto(adr)));

    return Object.freeze({
      items,
      summary: Object.freeze({
        total: items.length,
        proposed: items.filter((item) => item.status === 'Proposed').length,
        accepted: items.filter((item) => item.status === 'Accepted').length,
        deprecated: items.filter((item) => item.status === 'Deprecated').length,
        superseded: items.filter((item) => item.status === 'Superseded').length,
      }),
    });
  }
}
