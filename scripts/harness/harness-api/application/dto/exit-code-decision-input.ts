// exit-code-decision-input.ts — ExitCodeDecisionInput DTO

import type { ResponseStatus } from '../../domain/value-objects/harness-api-response.js';

export interface ExitCodeDecisionInput {
  status: ResponseStatus;
  commandName: string;
}
