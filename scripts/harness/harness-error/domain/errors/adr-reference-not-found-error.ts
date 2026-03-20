/**
 * @layer domain
 * @unit harness-error
 *
 * ADR参照先が実在しない場合に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class AdrReferenceNotFoundError extends HarnessErrorDomainError {
  constructor(adrRef: string) {
    super(
      `ADR参照先が見つかりません: "${adrRef}"。docs/ADR/ 配下に対応するADRが存在するか確認してください。`
    );
    this.name = 'AdrReferenceNotFoundError';
  }
}
