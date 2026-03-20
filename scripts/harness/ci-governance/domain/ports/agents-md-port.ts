/**
 * @layer domain
 * @unit ci-governance
 */

import type { AgentsMdPointer } from '../aggregates/agents-md-pointer.js';

export interface AgentsMdWriteResult {
  readonly before: number;
  readonly after: number;
}

export interface AgentsMdPort {
  read(): Promise<AgentsMdPointer>;
  write(pointer: AgentsMdPointer): Promise<AgentsMdWriteResult>;
}
