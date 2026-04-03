// impact-analysis-handler.ts — ImpactAnalysisHandler

import type { DispatchCommandUseCase } from '../../application/usecases/dispatch-command-usecase.js';
import { HarnessApiJsonFormatter } from '../formatters/harness-api-json-formatter.js';
import type { CLIOutputOptions } from '../dto/cli-output-options.js';

const STORY_ID_REGEX = /^H\d{2}-\d{2}$/;

export class ImpactAnalysisHandler {
  private readonly dispatchUseCase: Pick<DispatchCommandUseCase, 'execute'>;

  constructor(dispatchUseCase: Pick<DispatchCommandUseCase, 'execute'>) {
    this.dispatchUseCase = dispatchUseCase;
  }

  async handle(
    args: Record<string, string>,
    flags: Record<string, boolean | string>,
    options: CLIOutputOptions = {}
  ): Promise<void> {
    const storyId = args.storyId ?? '';

    if (!storyId || !STORY_ID_REGEX.test(storyId)) {
      const errorResponse = {
        status: 'error' as const,
        errors: [{ code: 'MISSING_OR_INVALID_ARGUMENT', severity: 'error', message: 'storyId argument is required and must match HXX-XX format' }],
        summary: 'Missing or invalid storyId argument',
        data: undefined,
      };
      process.stdout.write(HarnessApiJsonFormatter.format(errorResponse, options) + '\n');
      process.exitCode = 2;
      return;
    }

    const result = await this.dispatchUseCase.execute({
      commandName: 'phasegate:impact-analysis',
      args,
      flags,
    });

    const json = HarnessApiJsonFormatter.format(result.response, options);
    process.stdout.write(json + '\n');
    process.exitCode = result.exitCode;
  }
}
