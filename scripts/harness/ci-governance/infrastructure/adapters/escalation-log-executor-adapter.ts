/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * EscalationExecutorPort実装
 */

import type { EscalationExecutorPort } from '../../domain/ports/escalation-executor-port.js';
import type { EscalationAction } from '../../domain/value-objects/escalation-action.js';

export class EscalationLogExecutorAdapter implements EscalationExecutorPort {
  async execute(action: EscalationAction, context: { errorCode: string; count: number }): Promise<void> {
    const message = action.formatMessage(context);
    if (action.logLevel === 'error') {
      console.error(`[ci-governance] ${message}`);
    } else {
      console.warn(`[ci-governance] ${message}`);
    }
  }
}
