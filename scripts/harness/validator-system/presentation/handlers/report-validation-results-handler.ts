/**
 * @layer presentation
 * @unit validator-system
 *
 * ReportValidationResultsHandler — 結果レポート CLIハンドラー
 */
import type { ValidationResultContract } from '../../application/dto/validation-result-contract.js';
import { AggregateValidationResultsUseCase } from '../../application/use-cases/aggregate-validation-results-usecase.js';
import { HumanValidationResultFormatter } from '../formatters/human-validation-result-formatter.js';
import { AgentValidationResultFormatter } from '../formatters/agent-validation-result-formatter.js';
import { CiValidationResultFormatter } from '../formatters/ci-validation-result-formatter.js';
import { readFile } from 'node:fs/promises';

export interface ReportValidationResultsHandlerArgs {
  input?: string;  // ファイルパス（省略時はstdin）
  format?: 'human' | 'agent' | 'ci' | 'json';
  failOnWarning?: boolean;
}

export function isValidationResultContract(obj: unknown): obj is ValidationResultContract {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.validatorId === 'string' &&
    typeof o.passed === 'boolean' &&
    Array.isArray(o.errors) &&
    typeof o.durationMs === 'number'
  );
}

export class ReportValidationResultsHandler {
  private readonly aggregateUseCase = new AggregateValidationResultsUseCase();

  async execute(args: ReportValidationResultsHandlerArgs): Promise<{ output: string; exitCode: number }> {
    try {
      let raw: string;
      if (args.input) {
        raw = await readFile(args.input, 'utf-8');
      } else {
        // stdin から読み取り（テスト環境では空文字列を使用）
        raw = '[]';
      }

      const parsed = JSON.parse(raw) as unknown[];
      const results = parsed.filter(isValidationResultContract);

      const report = this.aggregateUseCase.execute({
        results,
        failOnWarning: args.failOnWarning,
      });

      const format = args.format ?? 'human';
      let output: string;
      if (format === 'agent') {
        output = new AgentValidationResultFormatter().format(report);
      } else if (format === 'ci' || format === 'json') {
        output = new CiValidationResultFormatter().format(report);
      } else {
        output = new HumanValidationResultFormatter().format(report);
      }

      const exitCode = report.overallPassed ? 0 : 1;
      return { output, exitCode };
    } catch (err) {
      return { output: `実行エラー: ${err instanceof Error ? err.message : String(err)}`, exitCode: 2 };
    }
  }
}
