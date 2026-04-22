// @unit harness-error
// @layer domain

import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class AdrReferenceNotFoundError extends HarnessErrorDomainError {
  constructor(adrRef: string) {
    super(
      `ADR参照先が見つかりません: "${adrRef}"。docs/ADR/ 配下に対応するADRが存在するか確認してください。`
    );
    this.name = 'AdrReferenceNotFoundError';
  }
}
