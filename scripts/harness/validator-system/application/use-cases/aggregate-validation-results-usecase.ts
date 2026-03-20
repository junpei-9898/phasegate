/**
 * @layer application
 * @unit validator-system
 *
 * AggregateValidationResultsUseCase — H08-05: バリデータ結果統合集約
 */
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { AggregateResultsInput } from '../dto/aggregate-results-input.js';
import type { AggregatedValidationReport } from '../dto/aggregated-validation-report.js';

export class AggregateValidationResultsUseCase {
  execute(input: AggregateResultsInput): AggregatedValidationReport {
    const { results, failOnWarning = false } = input;

    let passedValidators = 0;
    let failedValidators = 0;
    let skippedValidators = 0;
    const allErrors: {
      code: string;
      severity: string;
      message: string;
      suggestion: string;
      [key: string]: unknown;
    }[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    const errorsByLayer: Record<'L2' | 'L3' | 'L4', number> = { L2: 0, L3: 0, L4: 0 };

    for (const result of results) {
      if (result.skipped) {
        skippedValidators++;
        continue;
      }

      const hasWarnings = result.errors.some((e) => e.severity === 'warning');
      const hasFail = !result.passed || (failOnWarning && hasWarnings);

      if (hasFail) {
        failedValidators++;
      } else {
        passedValidators++;
      }

      for (const error of result.errors) {
        const errorEntry = {
          code: error.code,
          severity: error.severity,
          message: error.message,
          suggestion: error.suggestion,
        };
        allErrors.push(errorEntry);

        if (error.severity === 'warning') {
          totalWarnings++;
        } else {
          totalErrors++;
        }

        // レイヤー別集計
        const code = error.code;
        if (code.startsWith('L2-')) errorsByLayer.L2++;
        else if (code.startsWith('L3-')) errorsByLayer.L3++;
        else if (code.startsWith('L4-')) errorsByLayer.L4++;
      }
    }

    const overallPassed = failedValidators === 0;
    const totalValidators = passedValidators + failedValidators + skippedValidators;

    const report: AggregatedValidationReport = Object.freeze({
      overallPassed,
      totalValidators,
      passedValidators,
      failedValidators,
      skippedValidators,
      allErrors: Object.freeze(allErrors),
      summary: Object.freeze({
        totalErrors,
        totalWarnings,
        errorsByLayer: Object.freeze(errorsByLayer),
      }),
      results: Object.freeze([...results]),
    });

    return report;
  }
}
