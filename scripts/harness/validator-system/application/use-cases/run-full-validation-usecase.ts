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
    // ISSUE-005 P1-4: targetLayers で絞り込み。未指定時は従来の includeL4 挙動を維持。
    const includeL4 = input.includeL4 !== false;
    const defaultLayers: readonly ('L2' | 'L3' | 'L4')[] = includeL4
      ? ['L2', 'L3', 'L4']
      : ['L2', 'L3'];
    const effectiveLayers = input.targetLayers ?? defaultLayers;
    const runL2 = effectiveLayers.includes('L2');
    const runL3 = effectiveLayers.includes('L3');
    const runL4 = effectiveLayers.includes('L4');

    type Result = {
      validatorId: string;
      passed: boolean;
      errors: readonly {
        code: string;
        severity: string;
        message: string;
        suggestion: string;
        [key: string]: unknown;
      }[];
      durationMs: number;
      skipped?: boolean;
    };

    let l2Results: readonly Result[] = [];
    if (runL2) {
      l2Results = await this.l2UseCase.execute({
        targetPaths: input.targetPaths,
        unitName: input.unitName,
        currentPhase: input.currentPhase,
      });
    }

    let l3Results: readonly Result[] = [];
    if (runL3) {
      l3Results = await this.l3UseCase.execute({
        targetPaths: input.targetPaths,
        coverageReportPath: input.coverageReportPath,
        requirementMatrixPath: input.requirementMatrixPath,
      });
    }

    let l4Results: readonly Result[] = [];
    if (runL4) {
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
