/**
 * @layer domain
 * @unit harness-error
 *
 * FixExample検証結果値オブジェクト
 * 検証の成否・理由・詳細診断を不変で保持する
 */
import { InvalidFixExampleValidationResultError } from '../errors/invalid-fix-example-validation-result-error.js';

export class FixExampleValidationResult {
  readonly passed: boolean;
  readonly validatorId: string;
  readonly reason: string | null;
  readonly diagnostics: readonly string[];

  private constructor(
    passed: boolean,
    validatorId: string,
    reason: string | null,
    diagnostics: readonly string[]
  ) {
    this.passed = passed;
    this.validatorId = validatorId;
    this.reason = reason;
    this.diagnostics = diagnostics;
    Object.freeze(this);
  }

  static success(validatorId: string): FixExampleValidationResult {
    return new FixExampleValidationResult(true, validatorId, null, []);
  }

  static failure(
    validatorId: string,
    reason: string,
    diagnostics?: readonly string[]
  ): FixExampleValidationResult {
    if (!reason || reason.length === 0) {
      throw new InvalidFixExampleValidationResultError(
        'failure時のreasonは必須です。空文字は許容されません。'
      );
    }
    const resolvedDiagnostics = diagnostics ?? [reason];
    if (resolvedDiagnostics.length === 0) {
      throw new InvalidFixExampleValidationResultError(
        'failure時のdiagnosticsは1件以上必要です。'
      );
    }
    return new FixExampleValidationResult(
      false,
      validatorId,
      reason,
      Object.freeze([...resolvedDiagnostics])
    );
  }

  equals(other: FixExampleValidationResult): boolean {
    if (this.passed !== other.passed) return false;
    if (this.validatorId !== other.validatorId) return false;
    if (this.reason !== other.reason) return false;
    if (this.diagnostics.length !== other.diagnostics.length) return false;
    return this.diagnostics.every((d, i) => d === other.diagnostics[i]);
  }
}
