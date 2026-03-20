import type { TestExecutionSummary } from '../../domain/value-objects/test-execution-summary.js';
import type { RunRegressionSuiteOutput } from '../dto/run-regression-suite-output.js';

export class TestExecutionSummaryMapper {
  static toOutput(
    summary: TestExecutionSummary,
    coverageThreshold: number
  ): RunRegressionSuiteOutput {
    const gateResult = summary.isPassedGate(coverageThreshold) ? 'go' : 'no-go';

    return {
      passedCount: summary.passedCount,
      failedCount: summary.failedCount,
      skippedCount: summary.skippedCount,
      totalCount: summary.totalCount,
      coverageRate: summary.coverageRate?.value ?? null,
      failures: summary.failures.map((f) => ({
        testCaseId: f.testCaseId,
        errorMessage: f.errorMessage,
        stackTrace: f.stackTrace,
      })),
      gateResult,
    };
  }
}
