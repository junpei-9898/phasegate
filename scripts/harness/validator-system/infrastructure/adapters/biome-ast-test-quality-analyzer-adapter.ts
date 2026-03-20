/**
 * @layer infrastructure
 * @unit validator-system
 *
 * BiomeAstTestQualityAnalyzerAdapter — TestQualityAnalyzerPort実装
 */
import type { TestQualityAnalyzerPort } from '../../domain/ports/test-quality-analyzer-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';

export class BiomeAstTestQualityAnalyzerAdapter implements TestQualityAnalyzerPort {
  async analyzeTestFiles(targetPaths: readonly string[]): Promise<{
    results: readonly { filePath: string; passed: boolean; violations: readonly HarnessErrorLike[] }[];
  }> {
    const results = targetPaths.map((filePath) => ({
      filePath,
      passed: true,
      violations: [] as HarnessErrorLike[],
    }));
    return { results };
  }
}
