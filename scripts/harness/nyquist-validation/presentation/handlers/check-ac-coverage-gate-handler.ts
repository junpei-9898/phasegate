/**
 * @layer presentation
 * @unit nyquist-validation
 */
import type { CheckAcCoverageGateUseCase } from '../../application/usecases/check-ac-coverage-gate-usecase.js';
import { AgentMatrixFormatter } from '../formatters/agent-matrix-formatter.js';
import { HumanMatrixFormatter } from '../formatters/human-matrix-formatter.js';
import { JsonMatrixFormatter } from '../formatters/json-matrix-formatter.js';

export interface CheckAcCoverageGateHandlerArgs {
  readonly matrixFilePath: string;
  readonly format?: 'human' | 'agent' | 'json';
}

export interface CheckAcCoverageGateHandlerDeps {
  readonly checkAcCoverageGateUseCase: CheckAcCoverageGateUseCase;
}

function formatExecutionError(error: unknown): string {
  return `実行エラー: ${error instanceof Error ? error.message : String(error)}`;
}

export class CheckAcCoverageGateHandler {
  private readonly checkAcCoverageGateUseCase: CheckAcCoverageGateUseCase;
  private readonly humanFormatter = new HumanMatrixFormatter();
  private readonly agentFormatter = new AgentMatrixFormatter();
  private readonly jsonFormatter = new JsonMatrixFormatter();

  constructor(deps: CheckAcCoverageGateHandlerDeps) {
    this.checkAcCoverageGateUseCase = deps.checkAcCoverageGateUseCase;
  }

  async execute(args: CheckAcCoverageGateHandlerArgs): Promise<{ output: string; exitCode: number }> {
    try {
      const result = await this.checkAcCoverageGateUseCase.execute({
        matrixFilePath: args.matrixFilePath,
      });

      const format = args.format ?? 'json';
      const output = format === 'agent'
        ? this.agentFormatter.formatGate(result)
        : format === 'json'
          ? this.jsonFormatter.formatGate(result)
          : this.humanFormatter.formatGate(result);

      return {
        output,
        exitCode: result.passed ? 0 : 1,
      };
    } catch (error: unknown) {
      return { output: formatExecutionError(error), exitCode: 2 };
    }
  }
}

// @story-id H08-07