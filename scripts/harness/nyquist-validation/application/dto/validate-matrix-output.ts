/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-01: ValidateMatrixUseCase 出力DTO
 */
import type { NyquistHarnessError } from '../../domain/services/ac-coverage-gate-policy.js';

export interface ValidateMatrixOutput {
  readonly passed: boolean;
  readonly errors: readonly NyquistHarnessError[];
  readonly schemaErrors: readonly NyquistHarnessError[];
  readonly integrityErrors: readonly NyquistHarnessError[];
  readonly validatedData: unknown | null;
}
