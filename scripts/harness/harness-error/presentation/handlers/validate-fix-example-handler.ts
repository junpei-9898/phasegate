/**
 * @layer presentation
 * @unit harness-error
 *
 * fix_example の検証を実行するハンドラー
 * --code 指定時は単一検証、未指定時は全件検証を行う
 */
import type { ValidateFixExampleInput } from '../../application/dto/validate-fix-example-input.js';
import type { ValidateFixExampleOutput } from '../../application/dto/validate-fix-example-output.js';

export type ValidateFixExampleFormat = 'human' | 'json';

export interface ValidateFixExampleHandlerInput {
  readonly code?: string;
  readonly failFast?: boolean;
  readonly format: ValidateFixExampleFormat;
}

export interface ValidateFixExampleHandlerOutput {
  readonly exitCode: number;
  readonly output: string;
}

export interface ValidateAllFixExamplesHandlerOutput {
  readonly results: readonly Readonly<ValidateFixExampleOutput>[];
  readonly summary: Readonly<{
    total: number;
    passed: number;
    failed: number;
  }>;
}

export interface ValidateFixExampleUseCasePort {
  execute(input: ValidateFixExampleInput): Promise<Readonly<ValidateFixExampleOutput>>;
}

export interface ValidateAllFixExamplesUseCasePort {
  execute(input: { readonly failFast?: boolean }): Promise<ValidateAllFixExamplesHandlerOutput>;
}

export interface ValidateFixExampleHandlerDeps {
  readonly validateFixExampleUseCase: ValidateFixExampleUseCasePort;
  readonly validateAllFixExamplesUseCase: ValidateAllFixExamplesUseCasePort;
}

export class ValidateFixExampleHandler {
  private readonly validateFixExampleUseCase: ValidateFixExampleUseCasePort;
  private readonly validateAllFixExamplesUseCase: ValidateAllFixExamplesUseCasePort;

  constructor(deps: ValidateFixExampleHandlerDeps) {
    this.validateFixExampleUseCase = deps.validateFixExampleUseCase;
    this.validateAllFixExamplesUseCase = deps.validateAllFixExamplesUseCase;
  }

  async execute(
    input: ValidateFixExampleHandlerInput,
  ): Promise<ValidateFixExampleHandlerOutput> {
    try {
      if (input.code !== undefined) {
        return await this.executeSingle(input.code, input.format);
      }
      return await this.executeAll(input.failFast ?? false, input.format);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return { exitCode: 2, output: `Error: ${message}` };
    }
  }

  private async executeSingle(
    code: string,
    format: ValidateFixExampleFormat,
  ): Promise<ValidateFixExampleHandlerOutput> {
    const result = await this.validateFixExampleUseCase.execute({ code });
    const exitCode = result.passed ? 0 : 1;
    const output = this.formatSingleResult(result, format);
    return { exitCode, output };
  }

  private async executeAll(
    failFast: boolean,
    format: ValidateFixExampleFormat,
  ): Promise<ValidateFixExampleHandlerOutput> {
    const result = await this.validateAllFixExamplesUseCase.execute({
      failFast,
    });
    const exitCode = result.summary.failed > 0 ? 1 : 0;
    const output = this.formatAllResults(result, format);
    return { exitCode, output };
  }

  private formatSingleResult(
    result: Readonly<ValidateFixExampleOutput>,
    format: ValidateFixExampleFormat,
  ): string {
    if (format === 'json') {
      return JSON.stringify(result, null, 2);
    }
    const status = result.passed ? 'PASS' : 'FAIL';
    const lines = [`[${status}] ${result.code} (validator: ${result.validatorId})`];
    for (const diagnostic of result.diagnostics) {
      lines.push(`  - ${diagnostic}`);
    }
    return lines.join('\n');
  }

  private formatAllResults(
    result: ValidateAllFixExamplesHandlerOutput,
    format: ValidateFixExampleFormat,
  ): string {
    if (format === 'json') {
      return JSON.stringify(result, null, 2);
    }
    const lines: string[] = [];
    for (const r of result.results) {
      const status = r.passed ? 'PASS' : 'FAIL';
      lines.push(`[${status}] ${r.code}`);
      for (const diagnostic of r.diagnostics) {
        lines.push(`  - ${diagnostic}`);
      }
    }
    lines.push('');
    lines.push(
      `Summary: ${result.summary.total} total, ${result.summary.passed} passed, ${result.summary.failed} failed`,
    );
    return lines.join('\n');
  }
}
