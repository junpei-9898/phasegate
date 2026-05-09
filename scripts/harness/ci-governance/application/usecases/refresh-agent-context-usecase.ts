/**
 * @layer application
 * @unit ci-governance
 */

import type { MigrateAgentsMdUseCase } from './migrate-agents-md-usecase.js';
import type { RefreshClaudeMdUseCase } from './refresh-claude-md-usecase.js';
import type { RefreshAgentContextInput } from '../dto/refresh-agent-context-input.js';
import type { RefreshAgentContextOutput } from '../dto/refresh-agent-context-output.js';

export class RefreshAgentContextUseCase {
  constructor(
    private readonly migrateAgentsMdUseCase: MigrateAgentsMdUseCase,
    private readonly refreshClaudeMdUseCase: RefreshClaudeMdUseCase,
  ) {}

  async execute(input: RefreshAgentContextInput): Promise<RefreshAgentContextOutput> {
    const [agentsMd, claudeMd] = await Promise.all([
      this.migrateAgentsMdUseCase.execute({ dryRun: input.dryRun }),
      this.refreshClaudeMdUseCase.execute({ dryRun: input.dryRun }),
    ]);
    const errors = [...agentsMd.errors, ...claudeMd.errors];
    return {
      success: agentsMd.success && claudeMd.success,
      applied: !input.dryRun && agentsMd.success && claudeMd.success,
      agentsMd,
      claudeMd,
      errors,
    };
  }
}
