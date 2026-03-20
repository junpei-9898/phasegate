/**
 * @layer domain
 * @unit ci-governance
 */

import type { EscalationAction } from '../value-objects/escalation-action.js';

export interface EscalationExecutorPort {
  execute(action: EscalationAction, context: { errorCode: string; count: number }): Promise<void>;
}
