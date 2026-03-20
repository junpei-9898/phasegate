/**
 * @layer domain
 * @unit harness-error
 *
 * severity の格下げ（error -> warning）が試みられた場合に送出されるドメインエラー
 */
import { HarnessErrorDomainError } from './harness-error-domain-error.js';

export class SeverityDowngradeViolationError extends HarnessErrorDomainError {
  constructor(requested: string, defaultSeverity: string) {
    super(
      `severity の格下げは禁止されています: default="${defaultSeverity}" に対して "${requested}" が要求されました。`
    );
    this.name = 'SeverityDowngradeViolationError';
  }
}
