// @layer presentation
// harness-api-json-formatter.ts — HarnessApiJsonFormatter

import type { HarnessApiResponseContract } from '../../application/dto/harness-api-response-contract.js';
import type { CLIOutputOptions } from '../dto/cli-output-options.js';

export class HarnessApiJsonFormatter {
  static format<T>(response: HarnessApiResponseContract<T>, options: CLIOutputOptions = {}): string {
    if (options.pretty) {
      return JSON.stringify(response, null, 2);
    }
    return JSON.stringify(response);
  }
}
