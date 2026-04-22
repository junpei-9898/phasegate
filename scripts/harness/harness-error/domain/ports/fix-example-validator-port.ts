// @unit harness-error
// @layer domain

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
