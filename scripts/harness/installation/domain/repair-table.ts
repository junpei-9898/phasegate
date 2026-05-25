// @unit installation
// @layer domain
// @work-item-id WI-145
// @work-item-id WI-215

import type { CheckId } from "./check-id.js";
import { SuggestedSkill } from "./suggested-skill.js";

const CONFIG_DOCTOR = SuggestedSkill.create({
  skillName: "phasegate-config-doctor",
  rationale: "既存設定にユーザーのカスタマイズがある場合、merge 位置と保持方針の判断が必要です。",
  invokeCommand: "invoke /phasegate-config-doctor",
});

const TOOLKIT_GUIDE = SuggestedSkill.create({
  skillName: "phasegate-toolkit-guide",
  rationale: "既存 CI workflow との意味的な競合は人間の判断が必要です。",
  invokeCommand: "invoke /phasegate-toolkit-guide",
});

export class RepairTable {
  private readonly table: ReadonlyMap<CheckId, SuggestedSkill | null>;

  constructor() {
    this.table = new Map<CheckId, SuggestedSkill | null>([
      ["claude-hook-missing", CONFIG_DOCTOR],
      ["claude-context-missing", CONFIG_DOCTOR],
      ["codex-hook-missing", CONFIG_DOCTOR],
      ["codex-context-missing", CONFIG_DOCTOR],
      ["husky-pre-commit-missing", CONFIG_DOCTOR],
      ["husky-commit-msg-missing", CONFIG_DOCTOR],
      ["husky-pre-push-missing", null],
      ["ci-workflow-missing", TOOLKIT_GUIDE],
      ["package-json-devdep-missing", null],
      ["claude-skills-symlink", null],
      ["codex-skills-symlink", null],
    ]);
    Object.freeze(this);
  }

  lookup(checkId: CheckId): SuggestedSkill | null {
    return this.table.get(checkId) ?? null;
  }
}
