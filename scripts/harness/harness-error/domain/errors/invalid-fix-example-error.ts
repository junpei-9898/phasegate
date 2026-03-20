/**
 * @layer domain
 * @unit harness-error
 *
 * FixExample の入力不正時に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class InvalidFixExampleError extends HarnessErrorDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFixExampleError';
  }
}
