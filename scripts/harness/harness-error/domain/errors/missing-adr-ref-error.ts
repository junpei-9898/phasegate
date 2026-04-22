// @unit harness-error
// @layer domain

import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class MissingAdrRefError extends HarnessErrorDomainError {
  constructor(code: string) {
    super(
      `エラーコード "${code}" は adr_ref が必須ですが、指定されていません。`
    );
    this.name = 'MissingAdrRefError';
  }
}
