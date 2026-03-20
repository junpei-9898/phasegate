/**
 * @layer application
 * @unit skill-quality
 */
import type { LoopStatus } from '../../domain/types/loop-status.js';
import type { LoopAttempt } from '../../domain/value-objects/loop-attempt.js';

export interface RunPlanCheckerLoopOutput {
  readonly status: LoopStatus;
  readonly loopHistory: readonly LoopAttempt[];
  readonly escalationRequired: boolean;
}
