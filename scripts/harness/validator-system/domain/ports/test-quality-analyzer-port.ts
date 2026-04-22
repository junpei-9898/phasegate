// @unit validator-system
// @layer domain

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
