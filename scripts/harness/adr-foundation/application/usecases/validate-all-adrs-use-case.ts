/**
 * @layer application
 * @unit adr-foundation
 */
import type { AdrRepositoryPort } from '../../domain/ports/adr-repository-port.js';
import type {
  AdrHarnessError,
  AdrValidationResultDto,
} from '../dto/adr-validation-result-dto.js';
import { ValidateAdrFrontmatterUseCase } from './validate-adr-frontmatter-use-case.js';

export interface ValidateAllAdrsInput {
  readonly failFast?: boolean;
}

export interface ValidateAllAdrsOutput {
  readonly valid: boolean;
  readonly results: readonly AdrValidationResultDto[];
  readonly errors: readonly AdrHarnessError[];
}

export class ValidateAllAdrsUseCase {
  constructor(private readonly adrRepository: AdrRepositoryPort) {}

  async execute(input: ValidateAllAdrsInput): Promise<Readonly<ValidateAllAdrsOutput>> {
    const adrs = await this.adrRepository.findAll();
    const validator = new ValidateAdrFrontmatterUseCase(this.adrRepository);
    const results: AdrValidationResultDto[] = [];
    const errors: AdrHarnessError[] = [];

    for (const adr of adrs) {
      const result = await validator.execute({ adrRef: adr.toAdrRef() });
      results.push(result);
      errors.push(...result.harnessErrors);

      if (input.failFast === true && result.valid === false) {
        break;
      }
    }

    return Object.freeze({
      valid: errors.length === 0,
      results: Object.freeze(results),
      errors: Object.freeze(errors),
    });
  }
}
