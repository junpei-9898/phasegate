// @layer presentation
// status-handler.ts — StatusHandler

import type { DispatchCommandUseCase } from '../../application/usecases/dispatch-command-usecase.js';
import { DecideExitCodeUseCase } from '../../application/usecases/decide-exit-code-usecase.js';
import { HarnessApiJsonFormatter } from '../formatters/harness-api-json-formatter.js';
import type { CLIOutputOptions } from '../dto/cli-output-options.js';

export class StatusHandler {
  private readonly dispatchUseCase: Pick<DispatchCommandUseCase, 'execute'>;
  private readonly decideExitCodeUseCase: DecideExitCodeUseCase;

  constructor(dispatchUseCase: Pick<DispatchCommandUseCase, 'execute'>) {
    this.dispatchUseCase = dispatchUseCase;
    this.decideExitCodeUseCase = new DecideExitCodeUseCase();
  }

  async handle(
    args: Record<string, string>,
    flags: Record<string, boolean | string>,
    options: CLIOutputOptions = {}
  ): Promise<void> {
    const result = await this.dispatchUseCase.execute({
      commandName: 'phasegate:status',
      args,
      flags,
    });

    // Apply D5 rule: phasegate:status never returns exitCode 1
    const exitDecision = this.decideExitCodeUseCase.execute({
      status: result.response.status,
      commandName: 'phasegate:status',
    });

    const json = HarnessApiJsonFormatter.format(result.response, options);
    process.stdout.write(json + '\n');
    process.exitCode = exitDecision.exitCode;
  }
}
