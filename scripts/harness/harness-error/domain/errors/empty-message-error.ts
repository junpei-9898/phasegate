/**
 * @layer domain
 * @unit harness-error
 *
 * message が空文字の場合に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class EmptyMessageError extends HarnessErrorDomainError {
  constructor() {
    super('message は空文字であってはなりません。');
    this.name = 'EmptyMessageError';
  }
}
