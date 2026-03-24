/**
 * @layer presentation
 * @unit nyquist-validation
 */
import type { ValidateMatrixUseCase } from '../../application/usecases/validate-matrix-usecase.js';
import { AgentMatrixFormatter } from '../formatters/agent-matrix-formatter.js';
import { HumanMatrixFormatter } from '../formatters/human-matrix-formatter.js';
import { JsonMatrixFormatter } from '../formatters/json-matrix-formatter.js';

export interface ValidateMatrixHandlerArgs {
  readonly matrixFilePath: string;
  readonly failFast?: boolean;
  readonly format?: 'human' | 'agent' | 'json';
}

export interface ValidateMatrixHandlerDeps {
  readonly validateMatrixUseCase: ValidateMatrixUseCase;
}

function formatExecutionError(error: unknown): string {
  return `実行エラー: ${error instanceof Error ? error.message : String(error)}`;
}

export class ValidateMatrixHandler {
  private readonly validateMatrixUseCase: ValidateMatrixUseCase;
  private readonly humanFormatter = new HumanMatrixFormatter();
  private readonly agentFormatter = new AgentMatrixFormatter();
  private readonly jsonFormatter = new JsonMatrixFormatter();

  constructor(deps: ValidateMatrixHandlerDeps) {
    this.validateMatrixUseCase = deps.validateMatrixUseCase;
  }

  async execute(args: ValidateMatrixHandlerArgs): Promise<{ output: string; exitCode: number }> {
    try {
      const result = await this.validateMatrixUseCase.execute({
        matrixFilePath: args.matrixFilePath,
        failFast: args.failFast,
      });

      const format = args.format ?? 'human';
      const output = format === 'agent'
        ? this.agentFormatter.formatValidation(result)
        : format === 'json'
          ? this.jsonFormatter.formatValidation(result)
          : this.humanFormatter.formatValidation(result);

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