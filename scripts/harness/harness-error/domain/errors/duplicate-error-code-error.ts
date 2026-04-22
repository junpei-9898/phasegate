// @unit harness-error
// @layer domain

import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class DuplicateErrorCodeError extends HarnessErrorDomainError {
  constructor(code: string) {
    super(
      `エラーコードが重複しています: "${code}"。同一コードの複数登録は禁止されています。`
    );
    this.name = 'DuplicateErrorCodeError';
  }
}
