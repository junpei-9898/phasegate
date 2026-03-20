/**
 * @layer domain
 * @unit harness-error
 *
 * fix_example が必須なのに未指定の場合に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class MissingFixExampleError extends HarnessErrorDomainError {
  constructor(code: string) {
    super(
      `エラーコード "${code}" は fix_example が必須ですが、指定されていません。`
    );
    this.name = 'MissingFixExampleError';
  }
}
