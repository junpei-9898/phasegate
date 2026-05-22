// @unit installation
// @layer application
// @work-item-id WI-145
// @work-item-id WI-209
// @work-item-id WI-210

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, projectPath, skillDirectoryLooksValid, skillTargetLooksValid } from "./check-utils.js";

export class CodexSkillsSymlinkCheck implements HeuristicCheck {
  readonly checkId = "codex-skills-symlink" as const;
  private readonly target = ".codex/skills";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const link = await inspector.readSymlink(projectPath(projectRoot, this.target));
    const files = await inspector.listFiles(projectPath(projectRoot, this.target));
    if (skillTargetLooksValid(link) && skillDirectoryLooksValid(files)) return null;
    if (link === null && skillDirectoryLooksValid(files)) return null;
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: ".codex/skills に phasegate skills がありません",
      repairMode: link === null || skillTargetLooksValid(link) ? "mechanical" : "manual",
    });
  }
}
