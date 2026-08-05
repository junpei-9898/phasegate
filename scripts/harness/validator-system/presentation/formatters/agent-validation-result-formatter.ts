/**
 * @layer presentation
 * @unit validator-system
 *
 * AgentValidationResultFormatter — AIエージェント向け詳細テキスト
 */
import type { AggregatedValidationReport } from "../../application/dto/aggregated-validation-report.js";

export class AgentValidationResultFormatter {
  format(report: AggregatedValidationReport): string {
    const lines: string[] = [];
    lines.push("VALIDATION_REPORT");
    lines.push(`OVERALL: ${report.overallPassed ? "PASS" : "FAIL"}`);
    lines.push(
      `TOTAL: ${report.totalValidators} PASSED: ${report.passedValidators} FAILED: ${report.failedValidators} SKIPPED: ${report.skippedValidators}`,
    );
    lines.push("");

    for (const result of report.results) {
      lines.push(`VALIDATOR: ${result.validatorId}`);
      lines.push(`STATUS: ${result.skipped ? "SKIPPED" : result.passed ? "PASSED" : "FAILED"}`);
      lines.push(`DURATION: ${result.durationMs}ms`);
      if (result.skipped && result.skipReason) {
        lines.push(`SKIP_REASON: ${result.skipReason}`);
      }
      if (result.errors.length > 0) {
        lines.push("ERRORS:");
        for (const error of result.errors) {
          lines.push(`  - CODE: ${error.code}`);
          lines.push(`    MESSAGE: ${error.message}`);
          // WI-357: 復旧手順を載せた suggestion は複数行になりうる。
          // 素朴に埋め込むと 2 行目以降がインデントを失い、ERRORS ブロックの
          // 構造が壊れて機械読みできなくなるため継続行を明示的に字下げする。
          const suggestionLines = String(error.suggestion).split("\n");
          lines.push(`    SUGGESTION: ${suggestionLines[0]}`);
          for (const continuation of suggestionLines.slice(1)) {
            lines.push(`      ${continuation}`);
          }
        }
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}
