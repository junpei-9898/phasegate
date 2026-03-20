/**
 * @layer application
 * @unit adr-foundation
 */
import type { AdrDetailDto } from '../dto/adr-detail-dto.js';
import { AdrNotFoundApplicationError } from '../dto/application-errors.js';
import { toAdrDetailDto } from '../mappers/adr-to-detail-dto-mapper.js';
import type { AdrRepositoryPort } from '../../domain/ports/adr-repository-port.js';

export interface GetAdrByRefInput {
  readonly adrRef: string;
}

export class GetAdrByRefUseCase {
  constructor(private readonly adrRepository: AdrRepositoryPort) {}

  async execute(input: GetAdrByRefInput): Promise<Readonly<AdrDetailDto>> {
    const adr = await this.adrRepository.findByRef(input.adrRef);

    if (!adr) {
      throw new AdrNotFoundApplicationError(input.adrRef);
    }

    return toAdrDetailDto(adr);
  }
}
