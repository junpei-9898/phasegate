import type { TestCase } from '../../domain/value-objects/regression-suite-definition.js';
import type { TestRunnerPort, TestRunnerResult } from '../../domain/ports/test-runner-port.js';

export class VitestTestRunnerAdapter implements TestRunnerPort {
  async runSuite(_testCases: ReadonlyArray<TestCase>): Promise<TestRunnerResult> {
    // In a real implementation, this would invoke Vitest programmatically
    // For now, return a stub result
    return {
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      totalCount: 0,
      coverageRate: null,
      failures: [],
    };
  }
}
