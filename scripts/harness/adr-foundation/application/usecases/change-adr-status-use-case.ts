/**
 * @layer application
 * @unit adr-foundation
 */
import type { AdrRepositoryPort } from '../../domain/ports/adr-repository-port.js';
import { AdrId } from '../../domain/value-objects/adr-id.js';
import type { ChangeAdrStatusCommand } from '../dto/change-adr-status-command.js';
import {
  AdrNotFoundApplicationError,
  SupersededByRequiredApplicationError,
  SupersededTargetNotFoundApplicationError,
} from '../dto/application-errors.js';

export interface ChangeAdrStatusOutput {
  readonly adrRef: string;
  readonly previousStatus: string;
  readonly currentStatus: string;
  readonly supersededBy?: string;
}

export class ChangeAdrStatusUseCase {
  constructor(private readonly adrRepository: AdrRepositoryPort) {}

  async execute(input: ChangeAdrStatusCommand): Promise<Readonly<ChangeAdrStatusOutput>> {
    const adr = await this.adrRepository.findByRef(input.adrRef);
    if (!adr) {
      throw new AdrNotFoundApplicationError(input.adrRef);
    }

    const previousStatus = adr.getStatus().value;
    const nextAdr =
      input.action === 'approve'
        ? adr.approve()
        : input.action === 'deprecate'
          ? adr.deprecate()
          : input.action === 'repropose'
            ? adr.repropose()
            : await this.supersede(adr, input.supersededBy);

    await this.adrRepository.save(nextAdr);

    return Object.freeze({
      adrRef: nextAdr.toAdrRef(),
      previousStatus,
      currentStatus: nextAdr.getStatus().value,
      supersededBy: nextAdr.getFrontmatter().superseded_by,
    });
  }

  private async supersede(
    adr: Awaited<ReturnType<AdrRepositoryPort['findByRef']>> extends infer T
      ? Exclude<T, null>
      : never,
    supersededBy: string | undefined,
  ) {
    if (!supersededBy) {
      throw new SupersededByRequiredApplicationError();
    }

    const nextAdrId = AdrId.fromAdrRef(supersededBy);
    if (!(await this.adrRepository.exists(nextAdrId))) {
      throw new SupersededTargetNotFoundApplicationError(supersededBy);
    }

    return adr.supersede(nextAdrId);
  }
}
