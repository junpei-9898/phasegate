/**
 * @layer domain
 * @unit nyquist-validation
 *
 * テストケース逆引きサービス（v1: 直接マッピングのみ）
 */
import type { RequirementTestMatrix } from '../aggregates/requirement-test-matrix.js';
import { ImpactAnalysisResult } from '../value-objects/impact-analysis-result.js';
import type { TestReference } from '../value-objects/test-reference.js';

export class ImpactAnalysisService {
  analyze(matrix: RequirementTestMatrix, storyId: string): ImpactAnalysisResult {
    const sm = matrix.findStoryMapping(storyId);
    if (sm === null) {
      return ImpactAnalysisResult.create({ storyId, directTests: [] });
    }

    const allRefs: TestReference[] = [];
    for (const acMapping of sm.acMappings) {
      for (const ref of acMapping.testReferences) {
        allRefs.push(ref);
      }
    }

    return ImpactAnalysisResult.create({ storyId, directTests: allRefs });
  }
}
