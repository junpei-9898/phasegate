/**
 * @layer domain
 * @unit validator-system
 *
 * AcCoveragePolicyPort — nyquist-validation AcCoverageGatePolicy（L3-004）
 */
import type { HarnessErrorLike } from '../value-objects/validation-result.js';

export interface AcCoveragePolicyPort {
  checkCoverage(context: { matrixFilePath?: string }): Promise<{
    passed: boolean;
    errors: readonly HarnessErrorLike[];
  }>;
}
