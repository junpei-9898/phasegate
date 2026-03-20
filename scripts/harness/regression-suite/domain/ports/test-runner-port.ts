import type { TestCase } from '../value-objects/regression-suite-definition.js';
import type { CoverageRate } from '../value-objects/coverage-rate.js';
import type { TestFailureDetail } from '../value-objects/test-failure-detail.js';

export interface TestRunnerResult {
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  totalCount: number;
  coverageRate: CoverageRate | null;
  failures: TestFailureDetail[];
}

export interface TestRunnerPort {
  runSuite(testCases: ReadonlyArray<TestCase>): Promise<TestRunnerResult>;
}
