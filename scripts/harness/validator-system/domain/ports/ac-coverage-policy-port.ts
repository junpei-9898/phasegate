/**
 * @layer domain
 * @unit validator-system
 *
 * AcCoveragePolicyPort — nyquist-validation AcCoverageGatePolicy（L3-004）
 */
import type { HarnessErrorLike } from '../value-objects/validation-result.js';

export interface RequirementTestMatrix {
  [key: string]: unknown;
}

export interface AcCoverageGatePolicy {
  check(matrix: RequirementTestMatrix): { passed: boolean; errors: HarnessErrorLike[] };
}

export interface AcCoveragePolicyPort {
  getPolicy(): Promise<AcCoverageGatePolicy>;
}
