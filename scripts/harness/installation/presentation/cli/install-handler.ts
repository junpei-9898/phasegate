// @unit installation
// @layer presentation
// @work-item-id WI-146

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
        exitCode: result.refused.length > 0 ? 1 : 0,
      };
    }
    const lines = [
      input.apply ? "phasegate install apply" : "phasegate install dry-run",
      ...result.plan.map((item) => {
        const hint = item.skillHint ? `; hint: ${item.skillHint}` : "";
        return `- ${item.path}: ${item.action} (${item.repairMode}, ${item.strategy}); diff: ${item.diff}${hint}`;
      }),
    ];
    if (result.backupDir !== null) lines.push(`backups: ${result.backupDir}`);
    if (result.refused.length > 0) {
      lines.push("");
      lines.push("Refused ai-assisted/manual targets. Re-run with --force after reviewing the hint.");
    }
    return {
      stdout: lines.join("\n"),
      exitCode: result.refused.length > 0 ? 1 : 0,
    };
  }
}
