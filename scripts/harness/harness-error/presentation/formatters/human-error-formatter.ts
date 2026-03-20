/**
 * @layer presentation
 * @unit harness-error
 *
 * HarnessErrorContract をヒューマンリーダブルなテキストに変換するフォーマッター
 */
import type { HarnessErrorContract } from '../../application/dto/harness-error-contract.js';

export interface HumanErrorFormatterOutput {
  readonly text: string;
}

export class HumanErrorFormatter {
  format(errors: readonly HarnessErrorContract[]): HumanErrorFormatterOutput {
    if (errors.length === 0) {
      return { text: 'No errors found.' };
    }

    const lines: string[] = [];

    for (const error of errors) {
      const icon = error.severity === 'error' ? 'ERROR' : 'WARN';
      lines.push(`[${icon}] ${error.code}: ${error.message}`);
      lines.push(`  Suggestion: ${error.suggestion}`);
      if (error.adr_ref !== undefined) {
        lines.push(`  ADR: ${error.adr_ref}`);
      }
      if (error.fix_example !== undefined) {
        lines.push(`  Fix: ${error.fix_example}`);
      }
      lines.push('');
    }

    const errorCount = errors.filter((e) => e.severity === 'error').length;
    const warningCount = errors.filter((e) => e.severity === 'warning').length;
    lines.push(`Total: ${errors.length} issue(s) — ${errorCount} error(s), ${warningCount} warning(s)`);

    return { text: lines.join('\n') };
  }
}
