/**
 * @layer application
 * @unit harness-error
 *
 * 複数定義の fix_example を一括検証するUseCase
 */
import type { ValidateFixExampleOutput } from '../dto/validate-fix-example-output.js';
import type { ErrorDefinitionRegistry } from '../../domain/services/error-definition-registry.js';
import type { ValidateFixExampleUseCase } from './validate-fix-example-use-case.js';

export interface ValidateAllFixExamplesInput {
  readonly layer?: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
  readonly validatorId?: string;
  readonly failFast?: boolean;
}

export interface ValidateAllFixExamplesOutput {
  readonly results: readonly Readonly<ValidateFixExampleOutput>[];
  readonly summary: Readonly<{
    total: number;
    passed: number;
    failed: number;
  }>;
}

export interface ValidateAllFixExamplesUseCaseDeps {
  readonly errorDefinitionRegistry: ErrorDefinitionRegistry;
  readonly validateFixExampleUseCase: ValidateFixExampleUseCase;
}

export class ValidateAllFixExamplesUseCase {
  private readonly errorDefinitionRegistry: ErrorDefinitionRegistry;
  private readonly validateFixExampleUseCase: ValidateFixExampleUseCase;

  constructor(deps: ValidateAllFixExamplesUseCaseDeps) {
    this.errorDefinitionRegistry = deps.errorDefinitionRegistry;
    this.validateFixExampleUseCase = deps.validateFixExampleUseCase;
  }

  async execute(
    input: ValidateAllFixExamplesInput
  ): Promise<ValidateAllFixExamplesOutput> {
    const definitions = this.errorDefinitionRegistry
      .getAllDefinitions()
      .filter((definition) => {
        if (input.layer !== undefined && definition.code.layer !== Number(input.layer[1])) {
          return false;
        }
        if (
          input.validatorId !== undefined &&
          definition.ownerValidatorId !== input.validatorId
        ) {
          return false;
        }
        return true;
      });

    const results: Readonly<ValidateFixExampleOutput>[] = [];

    for (const definition of definitions) {
      const actual = await this.validateFixExampleUseCase.execute({
        code: definition.code.toString(),
      });
      results.push(actual);

      if (input.failFast === true && actual.passed === false) {
        break;
      }
    }

    const frozenResults = Object.freeze([...results]);
    const summary = Object.freeze({
      total: frozenResults.length,
      passed: frozenResults.filter((result) => result.passed).length,
      failed: frozenResults.filter((result) => !result.passed).length,
    });

    return Object.freeze({
      results: frozenResults,
      summary,
    });
  }
}
