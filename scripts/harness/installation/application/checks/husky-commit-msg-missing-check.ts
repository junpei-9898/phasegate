// @unit installation
// @layer application
// @work-item-id WI-145

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, projectPath, scriptHasPhasegateBlock } from "./check-utils.js";

export class HuskyCommitMsgMissingCheck implements HeuristicCheck {
  readonly checkId = "husky-commit-msg-missing" as const;
  private readonly target = ".husky/commit-msg";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const content = await inspector.readText(projectPath(projectRoot, this.target));
    if (content !== null && scriptHasPhasegateBlock(content, ["phasegate commit-msg"])) return null;
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: ".husky/commit-msg に phasegate commit-msg hook がありません",
      repairMode: content === null || content.trim().length === 0 ? "mechanical" : "ai-assisted",
    });
  }
}
