// @unit installation
// @layer application
// @work-item-id WI-145

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, projectPath, skillTargetLooksValid } from "./check-utils.js";

export class ClaudeSkillsSymlinkCheck implements HeuristicCheck {
  readonly checkId = "claude-skills-symlink" as const;
  private readonly target = ".claude/skills";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const link = await inspector.readSymlink(projectPath(projectRoot, this.target));
    if (skillTargetLooksValid(link)) return null;
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: ".claude/skills が phasegate skills を指していません",
      repairMode: link === null ? "mechanical" : "manual",
    });
  }
}
