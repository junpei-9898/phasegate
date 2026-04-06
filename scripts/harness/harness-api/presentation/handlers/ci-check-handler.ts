// @layer presentation
// ci-check-handler.ts — CiCheckHandler

import type { DispatchCommandUseCase } from '../../application/usecases/dispatch-command-usecase.js';
import { HarnessApiJsonFormatter } from '../formatters/harness-api-json-formatter.js';
import type { CLIOutputOptions } from '../dto/cli-output-options.js';

export class CiCheckHandler {
  private readonly dispatchUseCase: Pick<DispatchCommandUseCase, 'execute'>;

  constructor(dispatchUseCase: Pick<DispatchCommandUseCase, 'execute'>) {
    this.dispatchUseCase = dispatchUseCase;
  }

  async handle(
    args: Record<string, string>,
    flags: Record<string, boolean | string>,
    options: CLIOutputOptions = {}
  ): Promise<void> {
    const result = await this.dispatchUseCase.execute({
      commandName: 'phasegate:ci-check',
      args,
      flags,
    });

    const json = HarnessApiJsonFormatter.format(result.response, options);
    process.stdout.write(json + '\n');
    process.exitCode = result.exitCode;
  }
}
