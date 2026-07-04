// @unit installation
// @layer presentation
// @work-item-id WI-146
// @work-item-id WI-175
// @work-item-id WI-207

import type { RunInstallUseCase } from "../../application/usecases/run-install.js";

export interface InstallHandlerInput {
  readonly projectRoot: string;
  readonly harnessRoot: string;
  readonly phasegateVersion: string;
  readonly dryRun: boolean;
  readonly apply: boolean;
  readonly force: boolean;
  readonly json: boolean;
  readonly includeClaude?: boolean;
  readonly includeCodex?: boolean;
  readonly includeHusky?: boolean;
  readonly includeCi?: boolean;
  readonly skillSet?: "core" | "all";
  readonly workflow?: "standard" | "strict";
  readonly agent?: "claude" | "codex" | "both";
  readonly personal?: boolean;
}

export interface InstallHandlerResult {
  readonly stdout: string;
  readonly exitCode: number;
}

export class InstallHandler {
  constructor(private readonly useCase: RunInstallUseCase) {}

  async execute(input: InstallHandlerInput): Promise<InstallHandlerResult> {
    const result = await this.useCase.execute(input);
    if (input.json) {
      return {
        stdout: JSON.stringify(result, null, 2),
        exitCode: result.refused.length > 0 || result.error !== undefined ? 1 : 0,
      };
    }
    const lines = [
      input.apply ? `phasegate install${input.personal ? " --personal" : ""} apply` : `phasegate install${input.personal ? " --personal" : ""} dry-run`,
      ...result.plan.map((item) => {
        const hint = item.skillHint ? `; hint: ${item.skillHint}` : "";
        const warn = item.warning ? `\n  WARNING: ${item.warning}` : "";
        return `- ${item.path}: ${item.action} (${item.repairMode}, ${item.strategy}); diff: ${item.diff}${hint}${warn}`;
      }),
    ];
    if (result.backupDir !== null) lines.push(`backups: ${result.backupDir}`);
    if (result.error !== undefined) {
      lines.push("");
      lines.push(`Apply error: ${result.error.target} ${result.error.operation} failed with ${result.error.code}`);
      lines.push(`Cause: ${result.error.likelyCause}`);
      lines.push(`Recovery: ${result.error.recovery}`);
      if (result.error.partialChanges.length > 0) lines.push(`Partial changes: ${result.error.partialChanges.join(", ")}`);
    }
    if (result.refused.length > 0) {
      lines.push("");
      lines.push("Refused ai-assisted/manual targets. Re-run with --force after reviewing the hint.");
    }
    return {
      stdout: lines.join("\n"),
      exitCode: result.refused.length > 0 || result.error !== undefined ? 1 : 0,
    };
  }
}
