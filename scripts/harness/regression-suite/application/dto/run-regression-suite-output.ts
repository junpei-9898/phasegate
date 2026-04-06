// @layer application
export interface TestFailureDetailOutput {
  testCaseId: string;
  errorMessage: string;
  stackTrace?: string;
}

export interface RunRegressionSuiteOutput {
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  totalCount: number;
  coverageRate: number | null;
  failures: TestFailureDetailOutput[];
  gateResult: 'go' | 'no-go';
}
