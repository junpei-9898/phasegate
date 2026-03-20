/**
 * @layer domain
 * @unit harness-error
 *
 * FixExample検証ポート
 * Infrastructure層が実装し、構文妥当性確認と適用後のvalidator通過を検証する
 */
import type { ErrorCode } from '../value-objects/error-code.js';
import type { FixExample } from '../value-objects/fix-example.js';
import type { FixExampleValidationResult } from '../value-objects/fix-example-validation-result.js';

export interface FixExampleValidatorPort {
  validate(input: {
    validatorId: string;
    errorCode: ErrorCode;
    fixExample: FixExample;
  }): Promise<FixExampleValidationResult>;
}
