/**
 * @layer domain
 * @unit nyquist-validation
 *
 * AC網羅ゲート判定ポリシー
 * validator-system の L3-004 が実行主体として呼び出す公開ポリシー
 */
// @work-item-id WI-292
import type { RequirementTestMatrix } from '../aggregates/requirement-test-matrix.js';
import type { StoryMapping, StoryCoverageStatus } from '../entities/story-mapping.js';

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
      if (!this.hasValidCoverageLifecycle(sm)) {
        errors.push({
          code: 'L3-004',
          severity: 'error',
          message: `Invalid coverage lifecycle: ${sm.storyId} (${sm.coverageLifecycle.join(' -> ')}; status=${sm.coverageStatus})`,
        });
        continue;
      }
      if (sm.coverageStatus === 'planned') {
        if (sm.testReferenceCount() > 0) {
          errors.push({
            code: 'L3-004',
            severity: 'error',
            message: `Planned Story has test references; transition coverage status to required: ${sm.storyId}`,
          });
        }
        continue;
      }
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

  private hasValidCoverageLifecycle(story: StoryMapping): boolean {
    const lifecycle: readonly StoryCoverageStatus[] = story.coverageLifecycle;
    const validSequence =
      (lifecycle.length === 1 && (lifecycle[0] === 'planned' || lifecycle[0] === 'required'))
      || (lifecycle.length === 2 && lifecycle[0] === 'planned' && lifecycle[1] === 'required');
    return validSequence && lifecycle[lifecycle.length - 1] === story.coverageStatus;
  }
}
