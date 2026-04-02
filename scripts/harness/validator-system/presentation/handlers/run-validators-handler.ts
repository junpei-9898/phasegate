/**
 * @layer presentation
 * @unit validator-system
 *
 * RunValidatorsHandler — バリデータ実行 CLIハンドラー
 */
import type { RunFullValidationUseCase } from '../../application/use-cases/run-full-validation-usecase.js';
import type { RunL0ValidatorsUseCase } from '../../application/use-cases/run-l0-validators-usecase.js';
import type { RunL1ValidatorsUseCase } from '../../application/use-cases/run-l1-validators-usecase.js';
import type { AggregatedValidationReport } from '../../application/dto/aggregated-validation-report.js';
import { HumanValidationResultFormatter } from '../formatters/human-validation-result-formatter.js';
import { AgentValidationResultFormatter } from '../formatters/agent-validation-result-formatter.js';
import { CiValidationResultFormatter } from '../formatters/ci-validation-result-formatter.js';

export interface RunValidatorsHandlerArgs {
  layer?: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'all';
  validatorIds?: string[];
  targetPaths?: string[];
  unit?: string;
  phase?: string;
  format?: 'human' | 'agent' | 'ci';
  failOnWarning?: boolean;
  noL4?: boolean;
}

export interface RunValidatorsHandlerDeps {
  runFullValidationUseCase: RunFullValidationUseCase;
  runL0ValidatorsUseCase?: RunL0ValidatorsUseCase;
  runL1ValidatorsUseCase?: RunL1ValidatorsUseCase;
}

export class RunValidatorsHandler {
  private readonly useCase: RunFullValidationUseCase;
  private readonly l0UseCase: RunL0ValidatorsUseCase | undefined;
  private readonly l1UseCase: RunL1ValidatorsUseCase | undefined;

  constructor(deps: RunValidatorsHandlerDeps) {
    this.useCase = deps.runFullValidationUseCase;
    this.l0UseCase = deps.runL0ValidatorsUseCase;
    this.l1UseCase = deps.runL1ValidatorsUseCase;
  }

  async execute(args: RunValidatorsHandlerArgs): Promise<{ output: string; exitCode: number }> {
    try {
      if (args.layer === 'L0') {
        const l0UseCase = this.l0UseCase;
        if (!l0UseCase) {
          return { output: 'L0 validators not configured', exitCode: 1 };
        }
        const l0Results = await l0UseCase.execute({
          validatorIds: args.validatorIds,
        });
        const l0Report: AggregatedValidationReport = {
          overallPassed: l0Results.every((r) => r.passed || r.skipped),
          totalValidators: l0Results.length,
          passedValidators: l0Results.filter((r) => r.passed).length,
          failedValidators: l0Results.filter((r) => !r.passed && !r.skipped).length,
          skippedValidators: l0Results.filter((r) => r.skipped).length,
          allErrors: l0Results.flatMap((r) => r.errors),
          summary: {
            totalErrors: l0Results.flatMap((r) => r.errors).filter((e) => e.severity === 'error').length,
            totalWarnings: l0Results.flatMap((r) => r.errors).filter((e) => e.severity === 'warning').length,
            errorsByLayer: { L2: 0, L3: 0, L4: 0 },
          },
          results: l0Results,
        };
        const format = args.format ?? 'human';
        let output: string;
        if (format === 'agent') {
          output = new AgentValidationResultFormatter().format(l0Report);
        } else if (format === 'ci') {
          output = new CiValidationResultFormatter().format(l0Report);
        } else {
          output = new HumanValidationResultFormatter().format(l0Report);
        }
        return { output, exitCode: l0Report.overallPassed ? 0 : 1 };
      }

      if (args.layer === 'L1') {
        const l1UseCase = this.l1UseCase;
        if (!l1UseCase) {
          return { output: 'L1 validators not configured', exitCode: 1 };
        }
        // 空配列はターゲット未指定として扱い、undefinedを渡してアダプター側のデフォルト探索を使う
        const l1TargetPaths = args.targetPaths && args.targetPaths.length > 0 ? args.targetPaths : undefined;
        const l1Results = await l1UseCase.execute({ targetPaths: l1TargetPaths });
        const l1Report: AggregatedValidationReport = {
          overallPassed: l1Results.every((r) => r.passed || r.skipped),
          totalValidators: l1Results.length,
          passedValidators: l1Results.filter((r) => r.passed).length,
          failedValidators: l1Results.filter((r) => !r.passed && !r.skipped).length,
          skippedValidators: l1Results.filter((r) => r.skipped).length,
          allErrors: l1Results.flatMap((r) => r.errors),
          summary: {
            totalErrors: l1Results.flatMap((r) => r.errors).filter((e) => e.severity === 'error').length,
            totalWarnings: l1Results.flatMap((r) => r.errors).filter((e) => e.severity === 'warning').length,
            errorsByLayer: { L2: 0, L3: 0, L4: 0 },
          },
          results: l1Results,
        };
        const format = args.format ?? 'human';
        let output: string;
        if (format === 'agent') {
          output = new AgentValidationResultFormatter().format(l1Report);
        } else if (format === 'ci') {
          output = new CiValidationResultFormatter().format(l1Report);
        } else {
          output = new HumanValidationResultFormatter().format(l1Report);
        }
        return { output, exitCode: l1Report.overallPassed ? 0 : 1 };
      }

      const report = await this.useCase.execute({
        targetPaths: args.targetPaths ?? [],
        unitName: args.unit ?? '',
        currentPhase: args.phase ?? '',
        includeL4: !args.noL4,
        failOnWarning: args.failOnWarning,
      });

      const format = args.format ?? 'human';
      let output: string;
      if (format === 'agent') {
        output = new AgentValidationResultFormatter().format(report);
      } else if (format === 'ci') {
        output = new CiValidationResultFormatter().format(report);
      } else {
        output = new HumanValidationResultFormatter().format(report);
      }

      const exitCode = report.overallPassed ? 0 : 1;
      return { output, exitCode };
    } catch (err) {
      return { output: `実行エラー: ${err instanceof Error ? err.message : String(err)}`, exitCode: 2 };
    }
  }
}
