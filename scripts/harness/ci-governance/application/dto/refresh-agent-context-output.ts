/**
 * @layer application
 * @unit ci-governance
 */

import type { MigrateAgentsMdOutput } from './migrate-agents-md-output.js';
import type { RefreshClaudeMdOutput } from './refresh-claude-md-output.js';

export interface RefreshAgentContextOutput {
  readonly success: boolean;
  readonly applied: boolean;
  readonly agentsMd: MigrateAgentsMdOutput;
  readonly claudeMd: RefreshClaudeMdOutput;
  readonly errors: Array<{ code: string; message: string }>;
}
