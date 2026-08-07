// @unit installation
// @layer presentation
// @work-item-id WI-148
// @work-item-id WI-384

import type { RunReconcileUseCase } from "../../application/usecases/run-reconcile.js";
import { CODEX_HOOK_TRUST_REQUIRED_NOTICE } from "../../application/operator-notice.js";

export interface ReconcileHandlerInput {
  readonly projectRoot: string;
  readonly harnessRoot: string;
  readonly phasegateVersion: string;
  readonly dryRun: boolean;
  readonly apply: boolean;
  readonly force: boolean;
  readonly json: boolean;
}

export interface ReconcileHandlerResult {
  readonly stdout: string;
  readonly exitCode: number;
}

export class ReconcileHandler {
  constructor(private readonly useCase: RunReconcileUseCase) {}

  async execute(input: ReconcileHandlerInput): Promise<ReconcileHandlerResult> {
    const result = await this.useCase.execute(input);
    const operatorNotices = result.plan.some((item) => item.path === ".codex/hooks.json" && item.changed)
      ? [CODEX_HOOK_TRUST_REQUIRED_NOTICE]
      : [];
    if (input.json) {
      return {
        stdout: JSON.stringify({ ...result, operatorNotices }, null, 2),
        exitCode: result.refused.length > 0 ? 1 : 0,
      };
    }
    const lines = [
      input.apply ? "phasegate reconcile apply" : "phasegate reconcile dry-run",
      ...result.plan.map((item) => {
        const hint = item.skillHint ? `; hint: ${item.skillHint}` : "";
        return `- ${item.path}: ${item.action} (${item.repairMode}, ${item.strategy}); diff: ${item.diff}${hint}`;
      }),
    ];
    if (result.backupDir !== null) lines.push(`backups: ${result.backupDir}`);
    for (const notice of operatorNotices) lines.push(`Notice [${notice.code}]: ${notice.message}`);
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
