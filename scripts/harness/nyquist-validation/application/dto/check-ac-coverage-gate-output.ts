/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-02: CheckAcCoverageGateUseCase 出力DTO
 */
import type { NyquistHarnessError } from '../../domain/services/ac-coverage-gate-policy.js';
import type { RequirementTestMatrix } from '../../domain/aggregates/requirement-test-matrix.js';

export interface CheckAcCoverageGateOutput {
  readonly passed: boolean;
  readonly errors: readonly NyquistHarnessError[];
  readonly matrix: RequirementTestMatrix | null;
}
