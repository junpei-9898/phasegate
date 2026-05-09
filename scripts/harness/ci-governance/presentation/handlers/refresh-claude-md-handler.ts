/**
 * @layer presentation
 * @unit ci-governance
 */

import type { RefreshClaudeMdUseCase } from '../../application/usecases/refresh-claude-md-usecase.js';

export interface RefreshClaudeMdHandlerArgs {
  dryRun?: boolean;
  apply?: boolean;
  format?: 'human' | 'json';
}

export class RefreshClaudeMdHandler {
  constructor(private readonly useCase: RefreshClaudeMdUseCase) {}

  async handle(args: RefreshClaudeMdHandlerArgs): Promise<{ exitCode: number; output: string }> {
    const dryRun = args.apply === true ? false : (args.dryRun ?? true);
    const result = await this.useCase.execute({ dryRun });

    if (args.format === 'json') {
      return { exitCode: result.success ? 0 : 1, output: JSON.stringify(result, null, 2) };
    }

    if (!result.success) {
      return {
        exitCode: 1,
        output: ['CLAUDE.md refresh failed', ...result.errors.map((error) => `[${error.code}] ${error.message}`)].join('\n'),
      };
    }

    const mode = dryRun ? 'dry-run' : 'apply';
    return {
      exitCode: 0,
      output: `CLAUDE.md refresh ${mode}: changed=${result.changed}, applied=${result.applied}`,
    };
  }
}
