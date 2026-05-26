/**
 * @layer presentation
 * @unit validator-system
 *
 * HumanValidationResultFormatter — 開発者向けコンソール表示
 */
import type { AggregatedValidationReport } from '../../application/dto/aggregated-validation-report.js';

export class HumanValidationResultFormatter {
  format(report: AggregatedValidationReport): string {
    const lines: string[] = [];
    lines.push('=== バリデーション結果 ===');
    lines.push(`総合判定: ${report.overallPassed ? 'PASS ✓' : 'FAIL ✗'}`);
    lines.push(`バリデータ: ${report.totalValidators}件 (合格:${report.passedValidators} 失敗:${report.failedValidators} スキップ:${report.skippedValidators})`);
    lines.push('');

    for (const result of report.results) {
      // WI-094 / ADR-017: warning-only fail は [WARN]、error severity を含む fail は [FAIL]
      const hasNonWarningError = result.errors.some((e) => e.severity !== 'warning');
      const status = result.skipped
        ? 'SKIP'
        : result.passed
          ? 'PASS'
          : hasNonWarningError || result.errors.length === 0
            ? 'FAIL'
            : 'WARN';
      lines.push(`[${status}] ${result.validatorId} (${result.durationMs}ms)`);
      if (result.skipped && result.skipReason) {
        lines.push(`  → ${result.skipReason}`);
      }
      for (const error of result.errors) {
        lines.push(`  ⚠ ${error.message}`);
        lines.push(`  → ${error.suggestion}`);
      }
    }

    return lines.join('\n');
  }
}
