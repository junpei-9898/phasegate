// @layer application
// exit-code-decision-output.ts — ExitCodeDecisionOutput DTO

import type { ExitCode } from '../../domain/value-objects/harness-api-response.js';

export interface ExitCodeDecisionOutput {
  exitCode: ExitCode;
  reason: string;
}
