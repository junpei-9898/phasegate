/**
 * @layer domain
 * @unit validator-system
 *
 * TestQualityAnalyzerPort — AAAパターン・命名規約解析（L2-003）
 */
import type { HarnessErrorLike } from '../value-objects/validation-result.js';

export interface TestQualityAnalyzerPort {
  analyzeTestFiles(targetPaths: readonly string[]): Promise<{
    results: readonly {
      filePath: string;
      passed: boolean;
      violations: readonly HarnessErrorLike[];
    }[];
  }>;
}
