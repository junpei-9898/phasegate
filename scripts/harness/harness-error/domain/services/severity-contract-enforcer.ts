/**
 * @layer domain
 * @unit harness-error
 *
 * SeverityContractEnforcer ドメインサービス
 * defaultSeverity に対する格下げを禁止し、許容される effective severity を返す
 */
import { SeverityDowngradeViolationError } from '../errors/severity-downgrade-violation-error.js';
import type { Severity } from '../value-objects/severity.js';

export class SeverityContractEnforcer {
  resolveEffectiveSeverity(
    requested: Severity | undefined,
    defaultSeverity: Severity
  ): Severity {
    if (requested === undefined) {
      return defaultSeverity;
    }

    if (requested.isHigherThan(defaultSeverity)) {
      return requested;
    }

    if (requested.equals(defaultSeverity)) {
      return requested;
    }

    throw new SeverityDowngradeViolationError(
      requested.value,
      defaultSeverity.value
    );
  }

  assertNoDowngrade(requested: Severity, defaultSeverity: Severity): void {
    this.resolveEffectiveSeverity(requested, defaultSeverity);
  }
}
