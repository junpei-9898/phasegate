/**
 * @layer domain
 * @unit nyquist-validation
 *
 * AC網羅ゲート判定ポリシー
 * validator-system の L3-004 が実行主体として呼び出す公開ポリシー
 */
import type { RequirementTestMatrix } from '../aggregates/requirement-test-matrix.js';

export interface NyquistHarnessError {
  readonly code: string;
  readonly severity: string;
  readonly message: string;
}

export interface AcCoverageGatePolicyResult {
  readonly passed: boolean;
  readonly errors: readonly NyquistHarnessError[];
}

export class AcCoverageGatePolicy {
  check(matrix: RequirementTestMatrix): AcCoverageGatePolicyResult {
    const errors: NyquistHarnessError[] = [];

    for (const sm of matrix.getAllStoryMappings()) {
      for (const acId of sm.uncoveredAcIds()) {
        errors.push({
          code: 'L3-004',
          severity: 'error',
          message: `AC not covered: ${sm.storyId}.${acId}`,
        });
      }
    }

    if (errors.length === 0) {
      return { passed: true, errors: [] };
    }
    return { passed: false, errors: Object.freeze(errors) };
  }
}
