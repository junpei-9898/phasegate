/**
 * @layer domain
 * @unit nyquist-validation
 *
 * AC網羅率算出サービス（純粋な算出ロジック）
 */
import type { RequirementTestMatrix } from '../aggregates/requirement-test-matrix.js';
import { CoverageResult } from '../value-objects/coverage-result.js';

export class CoverageCalculationService {
  calculate(matrix: RequirementTestMatrix): CoverageResult {
    const totalAcCount = matrix.totalAcCount();
    const coveredAcCount = matrix.coveredAcCount();

    const uncoveredAcIds: string[] = [];
    for (const sm of matrix.getAllStoryMappings()) {
      for (const acId of sm.uncoveredAcIds()) {
        uncoveredAcIds.push(acId);
      }
    }

    let rate: number;
    if (totalAcCount === 0) {
      rate = 1.0;
    } else {
      // 小数点以下4桁で保持
      rate = Math.round((coveredAcCount / totalAcCount) * 10000) / 10000;
    }

    return CoverageResult.create({
      rate,
      coveredAcCount,
      totalAcCount,
      uncoveredAcIds,
    });
  }
}
