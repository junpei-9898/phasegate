/**
 * @layer presentation
 * @unit nyquist-validation
 */
import type { AnalyzeImpactUseCase } from '../../application/usecases/analyze-impact-usecase.js';
import { AgentMatrixFormatter } from '../formatters/agent-matrix-formatter.js';
import { HumanMatrixFormatter } from '../formatters/human-matrix-formatter.js';
import { JsonMatrixFormatter } from '../formatters/json-matrix-formatter.js';

export interface AnalyzeImpactHandlerArgs {
  readonly matrixFilePath: string;
  readonly storyId: string;
  readonly format?: 'human' | 'agent' | 'json';
}

export interface AnalyzeImpactHandlerDeps {
  readonly analyzeImpactUseCase: AnalyzeImpactUseCase;
}

function formatExecutionError(error: unknown): string {
  return `実行エラー: ${error instanceof Error ? error.message : String(error)}`;
}

export class AnalyzeImpactHandler {
  private readonly analyzeImpactUseCase: AnalyzeImpactUseCase;
  private readonly humanFormatter = new HumanMatrixFormatter();
  private readonly agentFormatter = new AgentMatrixFormatter();
  private readonly jsonFormatter = new JsonMatrixFormatter();

  constructor(deps: AnalyzeImpactHandlerDeps) {
    this.analyzeImpactUseCase = deps.analyzeImpactUseCase;
  }

  async execute(args: AnalyzeImpactHandlerArgs): Promise<{ output: string; exitCode: number }> {
    try {
      const result = await this.analyzeImpactUseCase.execute({
        matrixFilePath: args.matrixFilePath,
        storyId: args.storyId,
      });

      const format = args.format ?? 'human';
      const output = format === 'agent'
        ? this.agentFormatter.formatImpact(result)
        : format === 'json'
          ? this.jsonFormatter.formatImpact(result)
          : this.humanFormatter.formatImpact(result);

      return {
        output,
        exitCode: result.found ? 0 : 1,
      };
    } catch (error: unknown) {
      return { output: formatExecutionError(error), exitCode: 2 };
    }
  }
}

// @story-id H08-07