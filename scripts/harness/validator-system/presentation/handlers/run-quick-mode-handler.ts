/**
 * @layer presentation
 * @unit validator-system
 *
 * RunQuickModeHandler — Quickモード実行 CLIハンドラー
 */
import type { RunQuickModeUseCase } from '../../application/use-cases/run-quick-mode-usecase.js';
import type { ValidatorRelaxationProfile } from '../../application/dto/validator-relaxation-profile.js';
import { HumanValidationResultFormatter } from '../formatters/human-validation-result-formatter.js';
import { AgentValidationResultFormatter } from '../formatters/agent-validation-result-formatter.js';
import { CiValidationResultFormatter } from '../formatters/ci-validation-result-formatter.js';
import { AggregateValidationResultsUseCase } from '../../application/use-cases/aggregate-validation-results-usecase.js';

export interface RunQuickModeHandlerArgs {
  relaxationProfile: string;  // JSON文字列
  targetPaths: string[];
  unit: string;
  phase: string;
  format?: 'human' | 'agent' | 'ci';
}

export interface RunQuickModeHandlerDeps {
  runQuickModeUseCase: RunQuickModeUseCase;
}

export class RunQuickModeHandler {
  private readonly useCase: RunQuickModeUseCase;
  private readonly aggregateUseCase = new AggregateValidationResultsUseCase();

  constructor(deps: RunQuickModeHandlerDeps) {
    this.useCase = deps.runQuickModeUseCase;
  }

  async execute(args: RunQuickModeHandlerArgs): Promise<{ output: string; exitCode: number }> {
    try {
      const profile = JSON.parse(args.relaxationProfile) as ValidatorRelaxationProfile;

      const results = await this.useCase.execute({
        relaxationProfile: profile,
        targetPaths: args.targetPaths,
        unitName: args.unit,
        currentPhase: args.phase,
      });

      const report = this.aggregateUseCase.execute({ results });

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
