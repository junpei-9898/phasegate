// @unit installation
// @layer application
// @work-item-id WI-145

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, projectPath, scriptHasPhasegateBlock } from "./check-utils.js";

export class HuskyPreCommitMissingCheck implements HeuristicCheck {
  readonly checkId = "husky-pre-commit-missing" as const;
  private readonly target = ".husky/pre-commit";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const content = await inspector.readText(projectPath(projectRoot, this.target));
    if (
      content !== null &&
      scriptHasPhasegateBlock(content, [
        "phasegate lint",
        "phasegate check-phase-gate",
        "main.ts lint",
        "main.ts check-phase-gate",
        "$HARNESS_CMD lint",
        "$HARNESS_CMD check-phase-gate",
      ])
    ) {
      return null;
    }
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: ".husky/pre-commit に phasegate lint hook がありません",
      repairMode: content === null || content.trim().length === 0 ? "mechanical" : "ai-assisted",
    });
  }
}
