/**
 * @layer presentation
 * @unit ci-governance
 */

import type { RefreshAgentContextUseCase } from '../../application/usecases/refresh-agent-context-usecase.js';

export interface RefreshAgentContextHandlerArgs {
  dryRun?: boolean;
  apply?: boolean;
  format?: 'human' | 'json';
}

export class RefreshAgentContextHandler {
  constructor(private readonly useCase: RefreshAgentContextUseCase) {}

  async handle(args: RefreshAgentContextHandlerArgs): Promise<{ exitCode: number; output: string }> {
    const dryRun = args.apply === true ? false : (args.dryRun ?? true);
    const result = await this.useCase.execute({ dryRun });

    if (args.format === 'json') {
      return { exitCode: result.success ? 0 : 1, output: JSON.stringify(result, null, 2) };
    }

    if (!result.success) {
      return {
        exitCode: 1,
        output: ['Agent context refresh failed', ...result.errors.map((error) => `[${error.code}] ${error.message}`)].join('\n'),
      };
    }

    const mode = dryRun ? 'dry-run' : 'apply';
    const preview = dryRun ? `\n\nCLAUDE.md preview:\n${result.claudeMd.preview}` : '';
    return {
      exitCode: 0,
      output: [
        `Agent context refresh ${mode} complete`,
        `AGENTS.md added pointers: ${result.agentsMd.addedPointers}`,
        `CLAUDE.md changed: ${result.claudeMd.changed}`,
        `Applied: ${result.applied}`,
      ].join('\n') + preview,
    };
  }
}
