/**
 * @layer presentation
 * @unit skill-quality
 * @work-item-id WI-192
 */
import type { ApplyCascadeUpdateUseCase } from '../../application/usecases/apply-cascade-update-usecase.js';

export interface ApplyCascadeUpdateArgs {
  storyId: string;
  dryRun?: boolean;
  format?: 'human' | 'json';
}

export class ApplyCascadeUpdateHandler {
  constructor(private readonly useCase: ApplyCascadeUpdateUseCase) {}

  async handle(args: ApplyCascadeUpdateArgs): Promise<{ exitCode: number; message: string }> {
    try {
      const output = await this.useCase.execute({ storyId: args.storyId, dryRun: args.dryRun });
      if (args.format === 'json') {
        return {
          exitCode: output.errors.length > 0 ? 1 : 0,
          message: JSON.stringify({ dryRun: args.dryRun === true, ...output }, null, 2),
        };
      }
      const tagsLine = output.appliedStoryIds.join(', ');
      const verb = args.dryRun ? 'Would update' : 'Updated';
      let msg = `${verb} ${output.updatedCount} files with tags: ${tagsLine}`;

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
