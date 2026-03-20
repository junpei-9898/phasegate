/**
 * @layer application
 * @unit validator-system
 *
 * ValidationResultContractMapper — ValidationResult → Contract変換
 */
import type { ValidationResult } from '../../domain/value-objects/validation-result.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';

export class ValidationResultContractMapper {
  toContract(result: ValidationResult): ValidationResultContract {
    return {
      validatorId: result.validatorId.value,
      passed: result.passed,
      errors: result.errors.map((e) => ({
        code: typeof e.code === 'string' ? e.code : e.code.toString(),
        severity: typeof e.severity === 'string' ? e.severity : e.severity.toString(),
        message: e.message,
        suggestion: e.suggestion,
      })),
      durationMs: result.durationMs,
      skipped: result.skipped,
    };
  }

  toContracts(results: readonly ValidationResult[]): readonly ValidationResultContract[] {
    return results.map((r) => this.toContract(r));
  }
}
