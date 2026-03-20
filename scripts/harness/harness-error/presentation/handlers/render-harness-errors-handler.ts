/**
 * @layer presentation
 * @unit harness-error
 *
 * HarnessErrorContract[] を受け取り、指定フォーマットで整形して出力するハンドラー
 */
import type { HarnessErrorContract } from '../../application/dto/harness-error-contract.js';
import { HumanErrorFormatter } from '../formatters/human-error-formatter.js';
import { AgentErrorFormatter } from '../formatters/agent-error-formatter.js';
import { CiErrorFormatter } from '../formatters/ci-error-formatter.js';

export type OutputFormat = 'human' | 'agent' | 'ci';

export interface RenderHarnessErrorsInput {
  readonly errors: readonly HarnessErrorContract[];
  readonly format: OutputFormat;
  readonly failOnError: boolean;
}

export interface RenderHarnessErrorsOutput {
  readonly exitCode: number;
  readonly output: string;
}

export interface RenderHarnessErrorsHandlerDeps {
  readonly humanFormatter: HumanErrorFormatter;
  readonly agentFormatter: AgentErrorFormatter;
  readonly ciFormatter: CiErrorFormatter;
}

export class RenderHarnessErrorsHandler {
  private readonly humanFormatter: HumanErrorFormatter;
  private readonly agentFormatter: AgentErrorFormatter;
  private readonly ciFormatter: CiErrorFormatter;

  constructor(deps: RenderHarnessErrorsHandlerDeps) {
    this.humanFormatter = deps.humanFormatter;
    this.agentFormatter = deps.agentFormatter;
    this.ciFormatter = deps.ciFormatter;
  }

  execute(input: RenderHarnessErrorsInput): RenderHarnessErrorsOutput {
    if (!Array.isArray(input.errors)) {
      return { exitCode: 2, output: 'Input error: errors must be an array.' };
    }

    const output = this.formatErrors(input.errors, input.format);
    const hasErrors = input.errors.some((e) => e.severity === 'error');
    const exitCode = input.failOnError && hasErrors ? 1 : 0;

    return { exitCode, output };
  }

  private formatErrors(
    errors: readonly HarnessErrorContract[],
    format: OutputFormat,
  ): string {
    switch (format) {
      case 'human':
        return this.humanFormatter.format(errors).text;
      case 'agent':
        return this.agentFormatter.format(errors).json;
      case 'ci':
        return this.ciFormatter.format(errors).text;
    }
  }
}
