/**
 * @layer domain
 * @unit harness-error
 *
 * HarnessError 中心モデル（不変値オブジェクト）
 * 集約を持たず、全属性を不変で保持する値オブジェクトとして設計
 */
import type { AdrRef } from './adr-ref.js';
import type { ErrorCode } from './error-code.js';
import type { FixExample } from './fix-example.js';
import type { Severity } from './severity.js';

export interface HarnessErrorContract {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly suggestion: string;
  readonly adr_ref?: string;
  readonly fix_example?: string;
}

export interface HarnessErrorProps {
  readonly code: ErrorCode;
  readonly severity: Severity;
  readonly message: string;
  readonly suggestion: string;
  readonly adrRef: AdrRef | null;
  readonly fixExample: FixExample | null;
}

export class HarnessError {
  readonly code: ErrorCode;
  readonly severity: Severity;
  readonly message: string;
  readonly suggestion: string;
  readonly adrRef: AdrRef | null;
  readonly fixExample: FixExample | null;

  constructor(props: HarnessErrorProps) {
    this.code = props.code;
    this.severity = props.severity;
    this.message = props.message;
    this.suggestion = props.suggestion;
    this.adrRef = props.adrRef;
    this.fixExample = props.fixExample;
  }

  equals(other: HarnessError): boolean {
    const adrRefEqual =
      this.adrRef === null && other.adrRef === null
        ? true
        : this.adrRef !== null && other.adrRef !== null
          ? this.adrRef.equals(other.adrRef)
          : false;

    const fixExampleEqual =
      this.fixExample === null && other.fixExample === null
        ? true
        : this.fixExample !== null && other.fixExample !== null
          ? this.fixExample.equals(other.fixExample)
          : false;

    return (
      this.code.equals(other.code) &&
      this.severity.equals(other.severity) &&
      this.message === other.message &&
      this.suggestion === other.suggestion &&
      adrRefEqual &&
      fixExampleEqual
    );
  }

  hasAdrRef(): boolean {
    return this.adrRef !== null;
  }

  hasFixExample(): boolean {
    return this.fixExample !== null;
  }

  toContract(): Readonly<HarnessErrorContract> {
    const contract: HarnessErrorContract = {
      code: this.code.toString(),
      severity: this.severity.value,
      message: this.message,
      suggestion: this.suggestion,
      ...(this.adrRef !== null ? { adr_ref: this.adrRef.toString() } : {}),
      ...(this.fixExample !== null
        ? { fix_example: this.fixExample.toString() }
        : {}),
    };
    return Object.freeze(contract);
  }
}
