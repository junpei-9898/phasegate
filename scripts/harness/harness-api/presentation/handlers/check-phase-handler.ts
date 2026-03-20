// check-phase-handler.ts — CheckPhaseHandler

import type { DispatchCommandUseCase } from '../../application/usecases/dispatch-command-usecase.js';
import { HarnessApiJsonFormatter } from '../formatters/harness-api-json-formatter.js';
import type { CLIOutputOptions } from '../dto/cli-output-options.js';

export class CheckPhaseHandler {
  private readonly dispatchUseCase: Pick<DispatchCommandUseCase, 'execute'>;

  constructor(dispatchUseCase: Pick<DispatchCommandUseCase, 'execute'>) {
    this.dispatchUseCase = dispatchUseCase;
  }

  async handle(
    args: Record<string, string>,
    flags: Record<string, boolean | string>,
    options: CLIOutputOptions = {}
  ): Promise<void> {
    const unitId = args.unit ?? '';
    if (!unitId) {
      const errorResponse = {
        status: 'error' as const,
        errors: [{ code: 'MISSING_ARGUMENT', severity: 'error', message: 'unit argument is required' }],
        summary: 'Missing required argument: unit',
        data: undefined,
      };
      process.stdout.write(HarnessApiJsonFormatter.format(errorResponse, options) + '\n');
      process.exitCode = 2;
      return;
    }

    const result = await this.dispatchUseCase.execute({
      commandName: 'harness:check-phase',
      args,
      flags,
    });

    const json = HarnessApiJsonFormatter.format(result.response, options);
    process.stdout.write(json + '\n');
    process.exitCode = result.exitCode;
  }
}
