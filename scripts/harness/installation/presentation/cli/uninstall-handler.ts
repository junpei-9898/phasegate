// @unit installation
// @layer presentation
// @work-item-id WI-147
// @work-item-id WI-199

import type { RunUninstallUseCase } from "../../application/usecases/run-uninstall.js";

export interface UninstallHandlerInput {
  readonly projectRoot: string;
  readonly harnessRoot: string;
  readonly dryRun: boolean;
  readonly apply: boolean;
  readonly force: boolean;
  readonly json: boolean;
}

export interface UninstallHandlerResult {
  readonly stdout: string;
  readonly exitCode: number;
}

export class UninstallHandler {
  constructor(private readonly useCase: RunUninstallUseCase) {}

  async execute(input: UninstallHandlerInput): Promise<UninstallHandlerResult> {
    const result = await this.useCase.execute(input);
    if (input.json) {
      return {
        stdout: JSON.stringify(result, null, 2),
        exitCode: result.refused.length > 0 ? 1 : 0,
      };
    }
    const lines = [
      input.apply ? "phasegate uninstall apply" : "phasegate uninstall dry-run",
      ...result.plan.map((item) => {
        const hint = item.skillHint ? `; hint: ${item.skillHint}` : "";
        const protectedMarker = item.protected ? "; protected: true" : "";
        return `- ${item.path}: ${item.action} (${item.repairMode}, ${item.strategy}${protectedMarker}); diff: ${item.diff}${hint}`;
      }),
    ];
    if (result.backupDir !== null) lines.push(`backups: ${result.backupDir}`);
    if (result.archivedManifestPath !== null) lines.push(`archived manifest: ${result.archivedManifestPath}`);
    if (result.refused.length > 0) {
      lines.push("");
      lines.push("Refused protected, ai-assisted, or manual targets. Re-run with --force after reviewing the plan.");
    }
    return {
      stdout: lines.join("\n"),
      exitCode: result.refused.length > 0 ? 1 : 0,
    };
  }
}
