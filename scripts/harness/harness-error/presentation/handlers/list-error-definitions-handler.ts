/**
 * @layer presentation
 * @unit harness-error
 *
 * エラー定義一覧を表示するハンドラー
 * --format human|json、--layer フィルタをサポート
 */
import type { ErrorDefinitionSummary } from '../../application/dto/error-definition-summary.js';
import type { ListErrorDefinitionsQuery } from '../../application/dto/list-error-definitions-query.js';

export type ListErrorDefinitionsFormat = 'human' | 'json';

export interface ListErrorDefinitionsHandlerInput {
  readonly format: ListErrorDefinitionsFormat;
  readonly layer?: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
}

export interface ListErrorDefinitionsHandlerOutput {
  readonly exitCode: number;
  readonly output: string;
}

export interface ListErrorDefinitionsUseCasePort {
  execute(query: ListErrorDefinitionsQuery): Promise<readonly Readonly<ErrorDefinitionSummary>[]>;
}

export interface ListErrorDefinitionsHandlerDeps {
  readonly listErrorDefinitionsUseCase: ListErrorDefinitionsUseCasePort;
}

export class ListErrorDefinitionsHandler {
  private readonly listErrorDefinitionsUseCase: ListErrorDefinitionsUseCasePort;

  constructor(deps: ListErrorDefinitionsHandlerDeps) {
    this.listErrorDefinitionsUseCase = deps.listErrorDefinitionsUseCase;
  }

  async execute(
    input: ListErrorDefinitionsHandlerInput,
  ): Promise<ListErrorDefinitionsHandlerOutput> {
    try {
      const summaries = await this.listErrorDefinitionsUseCase.execute({
        layer: input.layer,
      });
      const output = this.formatSummaries(summaries, input.format);
      return { exitCode: 0, output };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return { exitCode: 2, output: `Error: ${message}` };
    }
  }

  private formatSummaries(
    summaries: readonly Readonly<ErrorDefinitionSummary>[],
    format: ListErrorDefinitionsFormat,
  ): string {
    if (format === 'json') {
      return JSON.stringify(summaries, null, 2);
    }

    if (summaries.length === 0) {
      return 'No error definitions found.';
    }

    const lines: string[] = [];
    for (const summary of summaries) {
      const severity = summary.defaultSeverity.toUpperCase();
      lines.push(`${summary.code}  [${severity}]  ${summary.title}`);
      lines.push(`  category: ${summary.category}  validator: ${summary.validatorId}`);
    }
    lines.push('');
    lines.push(`Total: ${summaries.length} definition(s)`);
    return lines.join('\n');
  }
}
