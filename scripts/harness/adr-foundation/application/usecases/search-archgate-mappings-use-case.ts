/**
 * @layer application
 * @unit adr-foundation
 */
import type { AdrRepositoryPort } from '../../domain/ports/adr-repository-port.js';
import type { ArchgateSearchResultDto } from '../dto/archgate-search-result-dto.js';
import { ArchgateSearchConditionRequiredError } from '../dto/application-errors.js';

export interface SearchArchgateMappingsInput {
  readonly validatorId?: string;
  readonly errorCode?: string;
}

export class SearchArchgateMappingsUseCase {
  constructor(private readonly adrRepository: AdrRepositoryPort) {}

  async execute(
    input: SearchArchgateMappingsInput,
  ): Promise<ReadonlyArray<ArchgateSearchResultDto>> {
    if (!input.validatorId && !input.errorCode) {
      throw new ArchgateSearchConditionRequiredError();
    }

    const adrs = await this.adrRepository.findAll();
    const results: ArchgateSearchResultDto[] = [];

    for (const adr of adrs) {
      const archgate = adr.getArchgate();
      if (!archgate) {
        continue;
      }

      for (const entry of archgate.enforcedBy) {
        const matchesValidator =
          input.validatorId === undefined || entry.matchesValidatorId(input.validatorId);
        const matchesErrorCode =
          input.errorCode === undefined || entry.matchesErrorCode(input.errorCode);

        if (matchesValidator && matchesErrorCode) {
          results.push(
            Object.freeze({
              validatorId: entry.validatorId,
              errorCode: entry.errorCode,
              adrRef: adr.toAdrRef(),
              title: adr.getFrontmatter().title,
              status: adr.getStatus().value,
            })
          );
        }
      }
    }

    return Object.freeze(results);
  }
}
