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
      errors: result.errors.map((e) => {
        const { code, severity, message, suggestion, ...details } = e;
        return {
        ...details,
        code: typeof code === 'string' ? code : code.toString(),
        severity: typeof severity === 'string' ? severity : severity.toString(),
        message: e.message,
        suggestion: e.suggestion,
        };
      }),
      durationMs: result.durationMs,
      skipped: result.skipped,
    };
  }

  toContracts(results: readonly ValidationResult[]): readonly ValidationResultContract[] {
    return results.map((r) => this.toContract(r));
  }
}
