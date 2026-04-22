// @unit harness-error
// @layer domain

import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class InvalidErrorCodeError extends HarnessErrorDomainError {
  constructor(raw: string) {
    super(
      `無効なエラーコード形式です: "${raw}"。L{0-4}-{3桁以上の数字} 形式で指定してください。`
    );
    this.name = 'InvalidErrorCodeError';
  }
}
