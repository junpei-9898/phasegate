/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { ViolationFormatterPort } from '../../domain/ports/violation-formatter-port.js';
import type { BuildHarnessErrorPayloadInput } from '../dto/build-harness-error-payload-input.js';
import type { BuildHarnessErrorPayloadOutput } from '../dto/build-harness-error-payload-output.js';
import { toBuildHarnessErrorPayloadOutput } from '../mappers/build-harness-error-payload-output-mapper.js';

export class ViolationFormattingFailedError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ViolationFormattingFailedError';
    this.cause = cause;
  }
}

export interface BuildHarnessErrorPayloadUseCaseDeps {
  readonly violationFormatterPort: ViolationFormatterPort;
}

export class BuildHarnessErrorPayloadUseCase {
  private readonly violationFormatterPort: ViolationFormatterPort;

  constructor(deps: BuildHarnessErrorPayloadUseCaseDeps) {
    this.violationFormatterPort = deps.violationFormatterPort;
  }

  async execute(
    input: BuildHarnessErrorPayloadInput
  ): Promise<Readonly<BuildHarnessErrorPayloadOutput>> {
    try {
      const formattedErrors = await this.violationFormatterPort.format(input.violations);

      if (formattedErrors.length !== input.violations.length) {
        throw new ViolationFormattingFailedError('formatted error count does not match violations');
      }

      return toBuildHarnessErrorPayloadOutput(input.violations, formattedErrors);
    } catch (error) {
      if (error instanceof ViolationFormattingFailedError) {
        throw error;
      }

      throw new ViolationFormattingFailedError('violation formatting failed', error);
    }
  }
}
