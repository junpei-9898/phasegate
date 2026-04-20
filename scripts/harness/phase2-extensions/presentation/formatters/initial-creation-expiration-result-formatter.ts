/**
 * @layer presentation
 * @unit phase2-extensions
 */
import type { CheckInitialCreationExpirationOutput } from '../../application/dto/check-initial-creation-expiration-output.js';

export class InitialCreationExpirationResultFormatter {
  formatJson(result: CheckInitialCreationExpirationOutput): string {
    return JSON.stringify(result, null, 2);
  }

  formatText(result: CheckInitialCreationExpirationOutput): string {
    const header = `total=${result.summary.total} ok=${result.summary.ok} warn=${result.summary.warn}`;
    const entries = result.results.map(
      (entry) =>
        `${entry.level}: ${entry.documentPath} (ageInDays=${entry.ageInDays}, commitCount=${entry.commitCount}, source=${entry.ageSource})`,
    );
    const warnings = result.warnings.map((warning) => `warning ${warning.code}: ${warning.message}`);
    const errors = result.errors.map((error) => `error ${error.code}: ${error.message}`);

    return [header, ...entries, ...warnings, ...errors].join('\n');
  }
}
