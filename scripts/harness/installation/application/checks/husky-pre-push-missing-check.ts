// @unit installation
// @layer application
// @work-item-id WI-145

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, projectPath, scriptHasPhasegateBlock } from "./check-utils.js";

export class HuskyPrePushMissingCheck implements HeuristicCheck {
  readonly checkId = "husky-pre-push-missing" as const;
  private readonly target = ".husky/pre-push";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const content = await inspector.readText(projectPath(projectRoot, this.target));
    if (content !== null && scriptHasPhasegateBlock(content, ["phasegate bypass:audit"])) return null;
    return createFinding({
      checkId: this.checkId,
      severity: "warn",
      target: this.target,
      message: ".husky/pre-push に phasegate bypass:audit hook がありません",
      repairMode: "mechanical",
    });
  }
}
