/**
 * @layer application
 * @unit adr-foundation
 */
import type {
  AdrHarnessError,
  AdrValidationResultDto,
} from '../dto/adr-validation-result-dto.js';

export function toHarnessErrors(
  validationResult: AdrValidationResultDto,
): ReadonlyArray<AdrHarnessError> {
  if (validationResult.valid || validationResult.violations.length === 0) {
    return Object.freeze([]);
  }

  return Object.freeze(
    validationResult.violations.map((violation) =>
      Object.freeze({
        code: violation.code,
        severity: 'error' as const,
        message: violation.message,
        suggestion: `${violation.field} を確認してください`,
        metadata: Object.freeze({
          adr_ref: validationResult.adrRef,
          field: violation.field,
        }),
      })
    )
  );
}
