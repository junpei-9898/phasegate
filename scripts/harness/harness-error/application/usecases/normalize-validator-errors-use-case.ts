/**
 * @layer application
 * @unit harness-error
 *
 * validator差分を除去して複数エラーを正規化するUseCase
 */
import type { HarnessErrorContract } from '../dto/harness-error-contract.js';
import type { ValidatorIssueDraft } from '../dto/validator-issue-draft.js';
import type { CreateHarnessErrorUseCase } from './create-harness-error-use-case.js';

export interface NormalizeValidatorErrorsUseCaseDeps {
  readonly createHarnessErrorUseCase: CreateHarnessErrorUseCase;
}

export interface NormalizeValidatorErrorsOutput {
  readonly errors: readonly Readonly<HarnessErrorContract>[];
  readonly summary: Readonly<{
    total: number;
    errors: number;
    warnings: number;
  }>;
}

export class NormalizeValidatorErrorsUseCase {
  private readonly createHarnessErrorUseCase: CreateHarnessErrorUseCase;

  constructor(deps: NormalizeValidatorErrorsUseCaseDeps) {
    this.createHarnessErrorUseCase = deps.createHarnessErrorUseCase;
  }

  async execute(
    drafts: readonly ValidatorIssueDraft[]
  ): Promise<NormalizeValidatorErrorsOutput> {
    const mapped = await Promise.all(
      drafts.map(async (draft, index) => ({
        index,
        contract: await this.createHarnessErrorUseCase.execute(draft),
      }))
    );

    const sortedContracts = mapped
      .sort((left, right) => {
        const codeComparison = left.contract.code.localeCompare(right.contract.code);
        if (codeComparison !== 0) {
          return codeComparison;
        }
        return left.index - right.index;
      })
      .map((entry) => entry.contract);

    const summary = Object.freeze({
      total: sortedContracts.length,
      errors: sortedContracts.filter((error) => error.severity === 'error').length,
      warnings: sortedContracts.filter((error) => error.severity === 'warning').length,
    });

    return Object.freeze({
      errors: Object.freeze([...sortedContracts]),
      summary,
    });
  }
}
