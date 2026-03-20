// harness-api-response.ts — HarnessApiResponse<T> Value Object

export type ResponseStatus = 'pass' | 'fail' | 'error';
export type ExitCode = 0 | 1 | 2;

export interface ResponseSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
}

export interface HarnessError {
  code: string;
  severity: string;
  message: string;
  suggestion?: string;
}

export interface HarnessApiResponseProps<T> {
  status: ResponseStatus;
  errors: readonly HarnessError[];
  summary: ResponseSummary | string;
  data?: T;
}

export class HarnessApiResponse<T = unknown> {
  readonly status: ResponseStatus;
  readonly errors: readonly HarnessError[];
  readonly summary: ResponseSummary | string;
  readonly data: T | undefined;

  private constructor(props: HarnessApiResponseProps<T>) {
    this.status = props.status;
    this.errors = Object.freeze([...(props.errors ?? [])]);
    this.summary = props.summary;
    this.data = props.data;
    Object.freeze(this);
  }

  static create<T>(props: HarnessApiResponseProps<T>): HarnessApiResponse<T> {
    // INV-3: pass のとき errors は空
    if (props.status === 'pass' && props.errors && props.errors.length > 0) {
      throw new Error('InvalidResponseStatusError: status=pass requires empty errors array (INV-3)');
    }
    // INV-4: fail/error のとき errors は 1件以上
    if ((props.status === 'fail' || props.status === 'error') && (!props.errors || props.errors.length === 0)) {
      throw new Error(`InvalidResponseStatusError: status=${props.status} requires at least one error (INV-4)`);
    }
    return new HarnessApiResponse<T>(props);
  }

  static pass<T>(summary: ResponseSummary | string, data?: T): HarnessApiResponse<T> {
    return new HarnessApiResponse<T>({ status: 'pass', errors: [], summary, data });
  }

  static fail<T>(
    errors: readonly HarnessError[],
    summary: ResponseSummary | string,
    data?: T
  ): HarnessApiResponse<T> {
    if (!errors || errors.length === 0) {
      throw new Error('HarnessApiDomainError: fail() requires at least one error');
    }
    return new HarnessApiResponse<T>({ status: 'fail', errors, summary, data });
  }

  static error<T>(
    errors: readonly HarnessError[],
    summary: ResponseSummary | string
  ): HarnessApiResponse<T> {
    if (!errors || errors.length === 0) {
      throw new Error('HarnessApiDomainError: error() requires at least one error');
    }
    return new HarnessApiResponse<T>({ status: 'error', errors, summary });
  }

  toExitCode(): ExitCode {
    if (this.status === 'pass') return 0;
    if (this.status === 'fail') return 1;
    return 2;
  }

  equals(other: HarnessApiResponse<T>): boolean {
    return (
      this.status === other.status &&
      JSON.stringify(this.errors) === JSON.stringify(other.errors) &&
      JSON.stringify(this.summary) === JSON.stringify(other.summary)
    );
  }
}
