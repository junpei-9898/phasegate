/**
 * @layer presentation
 * @unit validator-system
 *
 * AgentValidationResultFormatter — AIエージェント向け詳細テキスト
 */
import type { AggregatedValidationReport } from '../../application/dto/aggregated-validation-report.js';

export class AgentValidationResultFormatter {
  format(report: AggregatedValidationReport): string {
    const lines: string[] = [];
    lines.push('VALIDATION_REPORT');
    lines.push(`OVERALL: ${report.overallPassed ? 'PASS' : 'FAIL'}`);
    lines.push(`TOTAL: ${report.totalValidators} PASSED: ${report.passedValidators} FAILED: ${report.failedValidators} SKIPPED: ${report.skippedValidators}`);
    lines.push('');

    for (const result of report.results) {
      lines.push(`VALIDATOR: ${result.validatorId}`);
      lines.push(`STATUS: ${result.skipped ? 'SKIPPED' : result.passed ? 'PASSED' : 'FAILED'}`);
      lines.push(`DURATION: ${result.durationMs}ms`);
      if (result.errors.length > 0) {
        lines.push('ERRORS:');
        for (const error of result.errors) {
          lines.push(`  - CODE: ${error.code}`);
          lines.push(`    MESSAGE: ${error.message}`);
          lines.push(`    SUGGESTION: ${error.suggestion}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
