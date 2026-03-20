/**
 * @layer domain
 * @unit ci-governance
 *
 * ErrorRepetition集約ルート
 */

import { EscalationAction } from '../value-objects/escalation-action.js';
import { RepetitionResetCondition } from '../value-objects/repetition-reset-condition.js';
import { CiGovernanceDomainError } from '../errors/ci-governance-domain-error.js';

export class ErrorRepetition {
  readonly code: string;
  readonly occurrenceCount: number;
  readonly escalated: boolean;
  readonly threshold: number;
  readonly resetCondition: RepetitionResetCondition;
  private readonly _escalationAction: EscalationAction;

  private constructor(props: {
    code: string;
    occurrenceCount: number;
    escalated: boolean;
    threshold: number;
    resetCondition: RepetitionResetCondition;
    escalationAction: EscalationAction;
  }) {
    this.code = props.code;
    this.occurrenceCount = props.occurrenceCount;
    this.escalated = props.escalated;
    this.threshold = props.threshold;
    this.resetCondition = props.resetCondition;
    this._escalationAction = props.escalationAction;
  }

  static create(code: string, threshold = 3): ErrorRepetition {
    const resetCondition = RepetitionResetCondition.create({ resetOnResolution: true });
    const escalationAction = EscalationAction.create({
      logLevel: 'warn',
      messageTemplate: 'Error {errorCode} occurred {count} times. Consider resolving the root cause.',
    });
    return new ErrorRepetition({
      code,
      occurrenceCount: 0,
      escalated: false,
      threshold,
      resetCondition,
      escalationAction,
    });
  }

  static createWithCondition(
    code: string,
    threshold: number,
    resetConditionProps: { resetOnResolution: boolean },
  ): ErrorRepetition {
    const resetCondition = RepetitionResetCondition.create(resetConditionProps);
    const escalationAction = EscalationAction.create({
      logLevel: 'warn',
      messageTemplate: 'Error {errorCode} occurred {count} times.',
    });
    return new ErrorRepetition({
      code,
      occurrenceCount: 0,
      escalated: false,
      threshold,
      resetCondition,
      escalationAction,
    });
  }

  static createWithCount(code: string, occurrenceCount: number, threshold: number): ErrorRepetition {
    if (occurrenceCount < 0) {
      throw new CiGovernanceDomainError(
        'ERROR_REPETITION_INVALID_COUNT',
        `INV-5: occurrenceCount must be >= 0. Got: ${occurrenceCount}`,
      );
    }
    const resetCondition = RepetitionResetCondition.create({ resetOnResolution: true });
    const escalationAction = EscalationAction.create({
      logLevel: 'warn',
      messageTemplate: 'Error {errorCode} occurred {count} times.',
    });
    const escalated = occurrenceCount >= threshold;
    return new ErrorRepetition({
      code,
      occurrenceCount,
      escalated,
      threshold,
      resetCondition,
      escalationAction,
    });
  }

  increment(): ErrorRepetition {
    const newCount = this.occurrenceCount + 1;
    const newEscalated = newCount >= this.threshold;
    return new ErrorRepetition({
      code: this.code,
      occurrenceCount: newCount,
      escalated: newEscalated,
      threshold: this.threshold,
      resetCondition: this.resetCondition,
      escalationAction: this._escalationAction,
    });
  }

  isEscalated(): boolean {
    return this.escalated;
  }

  reset(): ErrorRepetition {
    if (!this.escalated) {
      throw new CiGovernanceDomainError(
        'REPETITION_RESET_FORBIDDEN',
        'INV-7: reset() can only be called when escalated=true',
      );
    }
    if (!this.resetCondition.isMet()) {
      throw new CiGovernanceDomainError(
        'REPETITION_RESET_FORBIDDEN',
        'INV-7: reset() requires RepetitionResetCondition to be met (resetOnResolution=true)',
      );
    }
    return new ErrorRepetition({
      code: this.code,
      occurrenceCount: 0,
      escalated: false,
      threshold: this.threshold,
      resetCondition: this.resetCondition,
      escalationAction: this._escalationAction,
    });
  }

  getEscalationAction(): EscalationAction {
    return this._escalationAction;
  }
}
