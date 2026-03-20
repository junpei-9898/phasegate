/**
 * @layer domain
 * @unit harness-error
 *
 * ErrorDefinitionRegistry に重複コードが登録された場合に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class DuplicateErrorCodeError extends HarnessErrorDomainError {
  constructor(code: string) {
    super(
      `エラーコードが重複しています: "${code}"。同一コードの複数登録は禁止されています。`
    );
    this.name = 'DuplicateErrorCodeError';
  }
}
