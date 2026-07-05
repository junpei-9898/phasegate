// @unit harness-error
// @layer domain

import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class SeverityDowngradeViolationError extends HarnessErrorDomainError {
  constructor(requested: string, defaultSeverity: string) {
    super(
      `severity の格下げは禁止されています: default="${defaultSeverity}" に対して "${requested}" が要求されました。根拠: ADR-021`
    );
    this.name = 'SeverityDowngradeViolationError';
  }
}
