/**
 * @layer application
 * @unit adr-foundation
 */
import type { AdrRepositoryPort } from '../../domain/ports/adr-repository-port.js';
import { AdrValidationService } from '../../domain/services/adr-validation-service.js';
import { AdrId } from '../../domain/value-objects/adr-id.js';
import type {
  AdrValidationResultDto,
  AdrValidationViolationDto,
} from '../dto/adr-validation-result-dto.js';
import { AdrNotFoundApplicationError } from '../dto/application-errors.js';
import { toHarnessErrors } from '../mappers/adr-validation-to-harness-error-mapper.js';

export interface ValidateAdrFrontmatterInput {
  readonly adrRef: string;
}

export class ValidateAdrFrontmatterUseCase {
  constructor(private readonly adrRepository: AdrRepositoryPort) {}

  async execute(
    input: ValidateAdrFrontmatterInput,
  ): Promise<Readonly<AdrValidationResultDto>> {
    const adr = await this.adrRepository.findByRef(input.adrRef);
    if (!adr) {
      throw new AdrNotFoundApplicationError(input.adrRef);
    }

    const validationService = new AdrValidationService();
    const violations: AdrValidationViolationDto[] = [];

    try {
      validationService.validateFrontmatter(adr.getFrontmatter());
    } catch (error) {
      violations.push(this.createViolation('frontmatter', 'ADR-FRONTMATTER-INVALID', error));
    }

    try {
      validationService.validateBody(adr.getBody());
    } catch (error) {
      violations.push(this.createViolation('body', 'ADR-BODY-SECTION-REQUIRED', error));
    }

    const supersededBy = adr.getFrontmatter().superseded_by;
    if (adr.getStatus().isSuperseded()) {
      if (!supersededBy) {
        violations.push({
          field: 'superseded_by',
          code: 'ADR-SUPERSEDED-BY-REQUIRED',
          message: 'Superseded の ADR には superseded_by が必須です',
        });
      } else if (!(await this.adrRepository.exists(AdrId.fromAdrRef(supersededBy)))) {
        violations.push({
          field: 'superseded_by',
          code: 'ADR-SUPERSEDED-TARGET-NOT-FOUND',
          message: 'superseded_by の参照先ADRが存在しません',
        });
      }
    }

    const baseResult = Object.freeze({
      adrRef: adr.toAdrRef(),
      valid: violations.length === 0,
      violations: Object.freeze(violations),
      harnessErrors: Object.freeze([]),
    });

    return Object.freeze({
      ...baseResult,
      harnessErrors: toHarnessErrors(baseResult),
    });
  }

  private createViolation(
    field: string,
    code: string,
    error: unknown,
  ): AdrValidationViolationDto {
    return Object.freeze({
      field,
      code,
      message: error instanceof Error ? error.message : 'ADR validation failed',
    });
  }
}
