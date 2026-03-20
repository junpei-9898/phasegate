/**
 * @layer application
 * @unit nyquist-validation
 *
 * ImpactAnalysisResult → AnalyzeImpactOutput マッパー
 */
import type { ImpactAnalysisResult } from '../../domain/value-objects/impact-analysis-result.js';
import type { AnalyzeImpactOutput } from '../dto/analyze-impact-output.js';

export class ImpactAnalysisResultMapper {
  static toOutput(result: ImpactAnalysisResult): AnalyzeImpactOutput {
    return {
      storyId: result.storyId,
      directTests: result.directTests.map((ref) => ({
        filePath: ref.filePath,
        testType: ref.testType,
      })),
      directMappingOnly: true,
      found: !result.isEmpty(),
    };
  }
}
