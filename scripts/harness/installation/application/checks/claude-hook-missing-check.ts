// @unit installation
// @layer application
// @work-item-id WI-145

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { containsPhasegateHook, createFinding, hasUserCustomization, projectPath } from "./check-utils.js";

export class ClaudeHookMissingCheck implements HeuristicCheck {
  readonly checkId = "claude-hook-missing" as const;
  private readonly target = ".claude/settings.json";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const absolutePath = projectPath(projectRoot, this.target);
    const exists = await inspector.exists(absolutePath);
    if (!exists) {
      return createFinding({
        checkId: this.checkId,
        severity: "red",
        target: this.target,
        message: ".claude/settings.json に phasegate hook が登録されていません",
        repairMode: "mechanical",
      });
    }
    const json = await inspector.readJson(absolutePath);
    if (json === null) {
      return createFinding({
        checkId: this.checkId,
        severity: "red",
        target: this.target,
        message: ".claude/settings.json を JSON として読めないため phasegate hook を確認できません",
        repairMode: "manual",
      });
    }
    if (containsPhasegateHook(json)) return null;
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: ".claude/settings.json に phasegate hook が登録されていません",
      repairMode: hasUserCustomization(json) ? "ai-assisted" : "mechanical",
    });
  }
}
