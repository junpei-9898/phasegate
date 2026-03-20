// registry-summary-output.ts — RegistrySummaryOutput DTO

import type { CommandName } from '../../domain/value-objects/cli-command-definition.js';

export interface RegistrySummaryOutput {
  registeredCount: number;
  commandNames: readonly CommandName[];
  failedRegistrations: readonly { commandName: string; reason: string }[];
}
