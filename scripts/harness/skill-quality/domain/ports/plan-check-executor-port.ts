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
  /** False for deterministic evaluators; omitted preserves legacy retry behavior. */
  readonly supportsRetry?: boolean;
  evaluate(planDocument: string, previousAttempts: readonly LoopAttempt[]): Promise<PlanCheckResult>;
}
