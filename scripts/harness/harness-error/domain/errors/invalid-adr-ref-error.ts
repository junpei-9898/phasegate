/**
 * @layer domain
 * @unit harness-error
 *
 * AdrRef の形式不正時に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class InvalidAdrRefError extends HarnessErrorDomainError {
  constructor(raw: string) {
    super(
      `無効なADR参照形式です: "${raw}"。ADR-{3桁の数字} 形式で指定してください。`
    );
    this.name = 'InvalidAdrRefError';
  }
}
