/**
 * @layer domain
 * @unit harness-error
 *
 * FixExampleValidationResult の不変条件違反時に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class InvalidFixExampleValidationResultError extends HarnessErrorDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFixExampleValidationResultError';
  }
}
