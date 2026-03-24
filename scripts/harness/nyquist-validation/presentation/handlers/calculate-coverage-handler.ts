/**
 * @layer presentation
 * @unit nyquist-validation
 */
import type { CalculateCoverageUseCase } from '../../application/usecases/calculate-coverage-usecase.js';
import { AgentMatrixFormatter } from '../formatters/agent-matrix-formatter.js';
import { HumanMatrixFormatter } from '../formatters/human-matrix-formatter.js';
import { JsonMatrixFormatter } from '../formatters/json-matrix-formatter.js';

export interface CalculateCoverageHandlerArgs {
  readonly matrixFilePath: string;
  readonly checkThreshold?: boolean;
  readonly format?: 'human' | 'agent' | 'json';
}

export interface CalculateCoverageHandlerDeps {
  readonly calculateCoverageUseCase: CalculateCoverageUseCase;
}

function formatExecutionError(error: unknown): string {
  return `実行エラー: ${error instanceof Error ? error.message : String(error)}`;
}

export class CalculateCoverageHandler {
  private readonly calculateCoverageUseCase: CalculateCoverageUseCase;
  private readonly humanFormatter = new HumanMatrixFormatter();
  private readonly agentFormatter = new AgentMatrixFormatter();
  private readonly jsonFormatter = new JsonMatrixFormatter();

  constructor(deps: CalculateCoverageHandlerDeps) {
    this.calculateCoverageUseCase = deps.calculateCoverageUseCase;
  }

  async execute(args: CalculateCoverageHandlerArgs): Promise<{ output: string; exitCode: number }> {
    try {
      const result = await this.calculateCoverageUseCase.execute({
        matrixFilePath: args.matrixFilePath,
        checkThreshold: args.checkThreshold,
      });

      const format = args.format ?? 'human';
      const output = format === 'agent'
        ? this.agentFormatter.formatCoverage(result)
        : format === 'json'
          ? this.jsonFormatter.formatCoverage(result)
          : this.humanFormatter.formatCoverage(result);

      const exitCode = args.checkThreshold === true && result.meetsThreshold === false ? 1 : 0;
      return { output, exitCode };
    } catch (error: unknown) {
      return { output: formatExecutionError(error), exitCode: 2 };
    }
  }
}

// @story-id H08-07