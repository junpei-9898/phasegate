/**
 * @layer presentation
 * @unit validator-system
 *
 * CiValidationResultFormatter — CI/GitHub Actions向けJSON
 */
import type { AggregatedValidationReport } from '../../application/dto/aggregated-validation-report.js';

export class CiValidationResultFormatter {
  format(report: AggregatedValidationReport): string {
    return JSON.stringify({
      overallPassed: report.overallPassed,
      totalValidators: report.totalValidators,
      passedValidators: report.passedValidators,
      failedValidators: report.failedValidators,
      skippedValidators: report.skippedValidators,
      summary: report.summary,
      results: report.results,
    }, null, 2);
  }
}
