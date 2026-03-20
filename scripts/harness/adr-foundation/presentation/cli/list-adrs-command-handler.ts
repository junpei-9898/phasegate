/**
 * @layer presentation
 * @unit adr-foundation
 */

import type { ListAdrsUseCase, ListAdrsInput, ListAdrsOutput } from '../../application/usecases/list-adrs-use-case.js';

export interface ListAdrsCommandInput {
  readonly statuses?: ReadonlyArray<'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded'>;
  readonly json?: boolean;
}

export interface ListAdrsCommandOutput {
  readonly exitCode: 0 | 2;
  readonly output: ListAdrsOutput | null;
  readonly text: string;
}

export interface ListAdrsCommandHandlerDeps {
  readonly listAdrsUseCase: Pick<ListAdrsUseCase, 'execute'>;
}

export class ListAdrsCommandHandler {
  private readonly useCase: Pick<ListAdrsUseCase, 'execute'>;

  constructor(deps: ListAdrsCommandHandlerDeps) {
    this.useCase = deps.listAdrsUseCase;
  }

  async execute(
    input: ListAdrsCommandInput,
  ): Promise<Readonly<ListAdrsCommandOutput>> {
    try {
      const useCaseInput: ListAdrsInput = {
        statuses: input.statuses as Array<'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded'> | undefined,
      };

      const output = await this.useCase.execute(useCaseInput);
      const text = input.json
        ? JSON.stringify(output, null, 2)
        : this.formatText(output);

      return Object.freeze({
        exitCode: 0,
        output,
        text,
      });
    } catch {
      return Object.freeze({
        exitCode: 2,
        output: null,
        text: 'Error: failed to list ADRs',
      });
    }
  }

  private formatText(output: ListAdrsOutput): string {
    const lines: string[] = [];
    lines.push(`ADR一覧 (${output.summary.total}件)`);
    lines.push('---');

    for (const item of output.items) {
      const superseded = item.supersededBy
        ? ` -> ${item.supersededBy}`
        : '';
      lines.push(
        `${item.adrRef} [${item.status}] ${item.title}${superseded}`,
      );
    }

    lines.push('---');
    lines.push(
      `Proposed: ${output.summary.proposed}, Accepted: ${output.summary.accepted}, Deprecated: ${output.summary.deprecated}, Superseded: ${output.summary.superseded}`,
    );

    return lines.join('\n');
  }
}
