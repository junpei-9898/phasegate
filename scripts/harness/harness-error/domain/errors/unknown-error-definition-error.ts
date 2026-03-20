/**
 * @layer domain
 * @unit harness-error
 *
 * ErrorDefinitionRegistry に未登録のコードが指定された場合に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class UnknownErrorDefinitionError extends HarnessErrorDomainError {
  constructor(code: string) {
    super(
      `未登録のエラーコードです: "${code}"。ErrorDefinitionRegistry に登録されているコードを使用してください。`
    );
    this.name = 'UnknownErrorDefinitionError';
  }
}
