/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-227
 *
 * AcBoundCoveragePolicyPort — L3-005（AC-bound coverage, fail-closed, default-OFF）
 *
 * L3-004（story-level の AC 網羅ゲート）とは独立した per-AC binding ゲート。
 * `acBoundStories`（スコープ）内の各 story について、全 linked AC が
 * ≥1 の `binding:"ac"` テスト参照（fileFallbackOnly===0）を持つことを検査する。
 */
import type { HarnessErrorLike } from '../value-objects/validation-result.js';

export interface AcBoundCoveragePolicyPort {
  checkAcBoundCoverage(context: {
    matrixFilePath?: string;
    acBoundStories: readonly string[];
  }): Promise<{
    passed: boolean;
    errors: readonly HarnessErrorLike[];
  }>;
}
