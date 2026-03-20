/**
 * @layer domain
 * @unit skill-quality
 */
import type { LoopAttempt } from '../value-objects/loop-attempt.js';

export interface PlanCheckResult {
  readonly coverageRate: number;
  readonly gaps: readonly string[];
  readonly revision: string;
}

export interface PlanCheckExecutorPort {
  evaluate(planDocument: string, previousAttempts: readonly LoopAttempt[]): Promise<PlanCheckResult>;
}
