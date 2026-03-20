/**
 * @layer domain
 * @unit harness-error
 *
 * suggestion が空文字の場合に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class EmptySuggestionError extends HarnessErrorDomainError {
  constructor() {
    super('suggestion は空文字であってはなりません。');
    this.name = 'EmptySuggestionError';
  }
}
