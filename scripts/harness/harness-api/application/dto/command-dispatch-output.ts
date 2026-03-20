// command-dispatch-output.ts — CommandDispatchOutput DTO

import type { ExitCode } from '../../domain/value-objects/harness-api-response.js';
import type { HarnessApiResponseContract } from './harness-api-response-contract.js';

export interface CommandDispatchOutput<T = unknown> {
  response: Readonly<HarnessApiResponseContract<T>>;
  exitCode: ExitCode;
}
