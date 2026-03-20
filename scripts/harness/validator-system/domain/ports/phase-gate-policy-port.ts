/**
 * @layer domain
 * @unit validator-system
 *
 * PhaseGatePolicyPort — phase-dependency-model Phase Gate前提条件
 */
import type { HarnessErrorLike } from '../value-objects/validation-result.js';

export interface PhaseGatePolicyPort {
  checkPrerequisites(context: { unitName: string; currentPhase: string }): Promise<{
    satisfied: boolean;
    violations: readonly HarnessErrorLike[];
  }>;
}
