/**
 * @layer presentation
 * @unit fuse-hooks-engine
 */

import { CompletionGateFormatter } from '../formatters/completion-gate-formatter.js';

export class CompletionGateHandler {
  private readonly formatter = new CompletionGateFormatter();

  constructor(
    private readonly checkCompletionGateUseCase: {
      execute(input: {
        storyId: string;
        magicFilePath: string;
        requiredFields?: string[];
      }): Promise<unknown>;
    },
  ) {}

  async handle(args: string[]): Promise<{ exitCode: number; output: string }> {
    const [storyId, magicFilePath = `.harness/done/${storyId}.done`] = args;
    const result = await this.checkCompletionGateUseCase.execute({ storyId, magicFilePath });
    return {
      exitCode: 0,
      output: this.formatter.format(result),
    };
  }
}
