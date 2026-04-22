// @unit harness-error
// @layer domain

import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class MissingFixExampleError extends HarnessErrorDomainError {
  constructor(code: string) {
    super(
      `エラーコード "${code}" は fix_example が必須ですが、指定されていません。`
    );
    this.name = 'MissingFixExampleError';
  }
}
