/**
 * @layer presentation
 * @unit phase2-extensions
 */
import type { CheckDocFreshnessOutput } from '../../application/dto/check-doc-freshness-output.js';

export class FreshnessResultFormatter {
  formatJson(result: CheckDocFreshnessOutput): string {
    return JSON.stringify(result, null, 2);
  }

  formatText(result: CheckDocFreshnessOutput): string {
    return [
      `total=${result.summary.total} ok=${result.summary.ok} warn=${result.summary.warn} error=${result.summary.error}`,
      ...result.results.map((entry) => `${entry.level}: ${entry.documentPath} (${entry.ageInDays}d)`),
    ].join('\n');
  }
}
