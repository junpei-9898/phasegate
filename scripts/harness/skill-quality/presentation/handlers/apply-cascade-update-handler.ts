/**
 * @layer presentation
 * @unit skill-quality
 */
import type { ApplyCascadeUpdateUseCase } from '../../application/usecases/apply-cascade-update-usecase.js';

export interface ApplyCascadeUpdateArgs {
  storyId: string;
  dryRun?: boolean;
}

export class ApplyCascadeUpdateHandler {
  constructor(private readonly useCase: ApplyCascadeUpdateUseCase) {}

  async handle(args: ApplyCascadeUpdateArgs): Promise<{ exitCode: number; message: string }> {
    try {
      const output = await this.useCase.execute({ storyId: args.storyId });
      const tagsLine = output.appliedStoryIds.join(', ');
      let msg = `Updated ${output.updatedCount} files with tags: ${tagsLine}`;

      if (output.errors.length > 0) {
        const errLines = output.errors.map((e) => `  - ${e}`).join('\n');
        msg += `\nErrors:\n${errLines}`;
        return { exitCode: 1, message: msg };
      }

      return { exitCode: 0, message: msg };
    } catch (err) {
      return { exitCode: 2, message: `Error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}
