// @unit harness-error
// @layer domain

import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class InvalidSeverityError extends HarnessErrorDomainError {
  constructor(raw: string) {
    super(
      `無効なseverityです: "${raw}"。"error" または "warning" のみ許容されます。`
    );
    this.name = 'InvalidSeverityError';
  }
}
