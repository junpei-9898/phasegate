/**
 * @layer domain
 * @unit validator-system
 *
 * ValidationResult 値オブジェクト
 * バリデータ実行結果のスナップショット（不変）
 */
import type { ValidatorId } from './validator-id.js';

/** HarnessError の最小互換型（harness-error Unit の HarnessError との疎結合） */
export interface HarnessErrorLike {
  readonly code: { readonly value?: string; toString(): string };
  readonly severity: { readonly value?: string; toString(): string };
  readonly message: string;
  readonly suggestion: string;
  [key: string]: unknown;
}

export interface ValidationResultRawProps {
  readonly validatorId: ValidatorId;
  readonly passed: boolean;
  readonly errors: readonly HarnessErrorLike[];
  readonly durationMs: number;
  readonly skipped: boolean;
  readonly skipReason?: string;
}

export class ValidationResult {
  readonly validatorId: ValidatorId;
  readonly passed: boolean;
  readonly errors: readonly HarnessErrorLike[];
  readonly durationMs: number;
  readonly skipped: boolean;
  readonly skipReason?: string;

  private constructor(props: ValidationResultRawProps) {
    this.validatorId = props.validatorId;
    this.passed = props.passed;
    this.errors = Object.freeze([...props.errors]);
    this.durationMs = props.durationMs;
    this.skipped = props.skipped;
    this.skipReason = props.skipReason;
    Object.freeze(this);
  }

  /** 内部生成（不変条件検証付き） */
  static createRaw(props: ValidationResultRawProps): ValidationResult {
    if (props.durationMs < 0) {
      throw new Error(`ValidationResult durationMs must be >= 0 (got: ${props.durationMs})`);
    }
    if (props.passed && props.errors.length > 0) {
      throw new Error('ValidationResult invariant violation: passed=true but errors is not empty (INV-5)');
    }
    if (props.skipped && (!props.passed || props.errors.length > 0)) {
      throw new Error('ValidationResult invariant violation: skipped=true requires passed=true and empty errors (INV-8)');
    }
    return new ValidationResult(props);
  }

  static pass(validatorId: ValidatorId, durationMs: number): ValidationResult {
    return ValidationResult.createRaw({ validatorId, passed: true, errors: [], durationMs, skipped: false });
  }

  static fail(validatorId: ValidatorId, errors: readonly HarnessErrorLike[], durationMs: number): ValidationResult {
    return new ValidationResult({ validatorId, passed: false, errors, durationMs, skipped: false });
  }

  /** fail の別名 */
  static failure(validatorId: ValidatorId, errors: HarnessErrorLike[], durationMs: number): ValidationResult {
    return ValidationResult.fail(validatorId, errors, durationMs);
  }

  static skip(validatorId: ValidatorId): ValidationResult {
    return new ValidationResult({ validatorId, passed: true, errors: [], durationMs: 0, skipped: true });
  }

  static skipWithReason(validatorId: ValidatorId, skipReason: string): ValidationResult {
    return new ValidationResult({ validatorId, passed: true, errors: [], durationMs: 0, skipped: true, skipReason });
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  errorCount(): number {
    return this.errors.length;
  }

  equals(other: ValidationResult): boolean {
    return (
      this.validatorId.equals(other.validatorId) &&
      this.passed === other.passed &&
      this.errors.length === other.errors.length
    );
  }
}
