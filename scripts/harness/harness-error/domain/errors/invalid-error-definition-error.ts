/**
 * @layer domain
 * @unit harness-error
 *
 * ErrorDefinition の不変条件違反時に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class InvalidErrorDefinitionError extends HarnessErrorDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidErrorDefinitionError';
  }
}
