/**
 * @layer presentation
 * @unit validator-system
 *
 * RunValidatorsHandler — バリデータ実行 CLIハンドラー
 */
import type { RunFullValidationUseCase } from '../../application/use-cases/run-full-validation-usecase.js';
import { HumanValidationResultFormatter } from '../formatters/human-validation-result-formatter.js';
import { AgentValidationResultFormatter } from '../formatters/agent-validation-result-formatter.js';
import { CiValidationResultFormatter } from '../formatters/ci-validation-result-formatter.js';

export interface RunValidatorsHandlerArgs {
  layer?: 'L2' | 'L3' | 'L4' | 'all';
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
}

export class RunValidatorsHandler {
  private readonly useCase: RunFullValidationUseCase;

  constructor(deps: RunValidatorsHandlerDeps) {
    this.useCase = deps.runFullValidationUseCase;
  }

  async execute(args: RunValidatorsHandlerArgs): Promise<{ output: string; exitCode: number }> {
    try {
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
