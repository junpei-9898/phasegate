/**
 * @layer domain
 * @unit ci-governance
 *
 * EscalationAction VO
 */

import type { EscalationLogLevel } from '../types/escalation-log-level.js';
import { isEscalationLogLevel } from '../types/escalation-log-level.js';

export interface EscalationActionProps {
  readonly logLevel: EscalationLogLevel;
  readonly messageTemplate: string;
}

export class EscalationAction {
  readonly logLevel: EscalationLogLevel;
  readonly messageTemplate: string;

  private constructor(props: EscalationActionProps) {
    this.logLevel = props.logLevel;
    this.messageTemplate = props.messageTemplate;
  }

  static create(props: EscalationActionProps): EscalationAction {
    if (!isEscalationLogLevel(props.logLevel)) {
      throw new Error(`Invalid logLevel: ${props.logLevel}. Must be 'warn' or 'error'`);
    }
    if (!props.messageTemplate || props.messageTemplate.trim() === '') {
      throw new Error('messageTemplate cannot be empty');
    }
    return new EscalationAction(props);
  }

  formatMessage(params: { errorCode: string; count: number }): string {
    return this.messageTemplate
      .replace(/\{errorCode\}/g, params.errorCode)
      .replace(/\{count\}/g, String(params.count));
  }

  equals(other: EscalationAction): boolean {
    return this.logLevel === other.logLevel && this.messageTemplate === other.messageTemplate;
  }
}
