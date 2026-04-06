// @layer domain
import type { CoverageRate } from './coverage-rate.js';
import type { TestFailureDetail } from './test-failure-detail.js';

export interface TestExecutionSummaryProps {
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  totalCount: number;
  coverageRate: CoverageRate | null;
  failures: TestFailureDetail[];
}

export class TestExecutionSummary {
  readonly passedCount: number;
  readonly failedCount: number;
  readonly skippedCount: number;
  readonly totalCount: number;
  readonly coverageRate: CoverageRate | null;
  readonly failures: ReadonlyArray<TestFailureDetail>;

  private constructor(props: TestExecutionSummaryProps) {
    this.passedCount = props.passedCount;
    this.failedCount = props.failedCount;
    this.skippedCount = props.skippedCount;
    this.totalCount = props.totalCount;
    this.coverageRate = props.coverageRate;
    this.failures = Object.freeze([...props.failures]);
    Object.freeze(this);
  }

  static create(props: TestExecutionSummaryProps): TestExecutionSummary {
    const expectedTotal = props.passedCount + props.failedCount + props.skippedCount;
    if (expectedTotal !== props.totalCount) {
      throw new Error(
        `TestCountIntegrityError: passedCount(${props.passedCount}) + failedCount(${props.failedCount}) + skippedCount(${props.skippedCount}) = ${expectedTotal} !== totalCount(${props.totalCount})`
      );
    }
    return new TestExecutionSummary(props);
  }

  isPassedGate(threshold: number): boolean {
    if (this.failedCount > 0) return false;
    if (this.coverageRate === null) return true;
    return this.coverageRate.meetsThreshold(threshold);
  }

  equals(other: TestExecutionSummary): boolean {
    return (
      this.passedCount === other.passedCount &&
      this.failedCount === other.failedCount &&
      this.skippedCount === other.skippedCount &&
      this.totalCount === other.totalCount
    );
  }
}
