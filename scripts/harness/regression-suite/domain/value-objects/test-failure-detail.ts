export interface TestFailureDetailProps {
  testCaseId: string;
  errorMessage: string;
  stackTrace?: string;
}

export class TestFailureDetail {
  readonly testCaseId: string;
  readonly errorMessage: string;
  readonly stackTrace: string | undefined;

  private constructor(props: TestFailureDetailProps) {
    this.testCaseId = props.testCaseId;
    this.errorMessage = props.errorMessage;
    this.stackTrace = props.stackTrace;
    Object.freeze(this);
  }

  static create(props: TestFailureDetailProps): TestFailureDetail {
    if (!props.testCaseId || props.testCaseId.trim().length === 0) {
      throw new Error('InvalidTestFailureDetailError: testCaseId must not be empty');
    }
    if (!props.errorMessage || props.errorMessage.trim().length === 0) {
      throw new Error('InvalidTestFailureDetailError: errorMessage must not be empty');
    }
    return new TestFailureDetail(props);
  }

  equals(other: TestFailureDetail): boolean {
    return this.testCaseId === other.testCaseId && this.errorMessage === other.errorMessage;
  }
}
