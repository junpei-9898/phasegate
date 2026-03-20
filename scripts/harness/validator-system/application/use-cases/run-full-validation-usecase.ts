/**
 * @layer application
 * @unit validator-system
 *
 * RunFullValidationUseCase — H08-06: フルバリデーション実行
 */
import type { RunFullValidationInput } from '../dto/run-full-validation-input.js';
import type { AggregatedValidationReport } from '../dto/aggregated-validation-report.js';
import type { RunL2ValidatorsUseCase } from './run-l2-validators-usecase.js';
import type { RunL3ValidatorsUseCase } from './run-l3-validators-usecase.js';
import type { RunL4ValidatorsUseCase } from './run-l4-validators-usecase.js';
import type { AggregateValidationResultsUseCase } from './aggregate-validation-results-usecase.js';

export interface RunFullValidationUseCaseDeps {
  runL2ValidatorsUseCase: RunL2ValidatorsUseCase;
  runL3ValidatorsUseCase: RunL3ValidatorsUseCase;
  runL4ValidatorsUseCase: RunL4ValidatorsUseCase;
  aggregateValidationResultsUseCase: AggregateValidationResultsUseCase;
}

export class RunFullValidationUseCase {
  private readonly l2UseCase: RunL2ValidatorsUseCase;
  private readonly l3UseCase: RunL3ValidatorsUseCase;
  private readonly l4UseCase: RunL4ValidatorsUseCase;
  private readonly aggregateUseCase: AggregateValidationResultsUseCase;

  constructor(deps: RunFullValidationUseCaseDeps) {
    this.l2UseCase = deps.runL2ValidatorsUseCase;
    this.l3UseCase = deps.runL3ValidatorsUseCase;
    this.l4UseCase = deps.runL4ValidatorsUseCase;
    this.aggregateUseCase = deps.aggregateValidationResultsUseCase;
  }

  async execute(input: RunFullValidationInput): Promise<AggregatedValidationReport> {
    const includeL4 = input.includeL4 !== false;

    const l2Results = await this.l2UseCase.execute({
      targetPaths: input.targetPaths,
      unitName: input.unitName,
      currentPhase: input.currentPhase,
    });

    const l3Results = await this.l3UseCase.execute({
      targetPaths: input.targetPaths,
      coverageReportPath: input.coverageReportPath,
      requirementMatrixPath: input.requirementMatrixPath,
    });

    let l4Results: readonly { validatorId: string; passed: boolean; errors: readonly { code: string; severity: string; message: string; suggestion: string; [key: string]: unknown }[]; durationMs: number; skipped?: boolean }[] = [];
    if (includeL4) {
      l4Results = await this.l4UseCase.execute({
        targetUnits: input.targetUnits,
      });
    }

    const allResults = [...l2Results, ...l3Results, ...l4Results];

    return this.aggregateUseCase.execute({
      results: allResults,
      failOnWarning: input.failOnWarning,
    });
  }
}
