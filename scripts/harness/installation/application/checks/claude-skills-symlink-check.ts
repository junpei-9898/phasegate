// @unit installation
// @layer application
// @work-item-id WI-145
// @work-item-id WI-209
// @work-item-id WI-210
// @work-item-id WI-216

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, phasegateSkillDirectoryLooksComplete, projectPath, skillTargetLooksValid } from "./check-utils.js";

export class ClaudeSkillsSymlinkCheck implements HeuristicCheck {
  readonly checkId = "claude-skills-symlink" as const;
  private readonly target = ".claude/skills";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const link = await inspector.readSymlink(projectPath(projectRoot, this.target));
    const files = await inspector.listFiles(projectPath(projectRoot, this.target));
    const metadata = await inspector.readText(projectPath(projectRoot, `${this.target}/.harness-version`));
    if (skillTargetLooksValid(link) && phasegateSkillDirectoryLooksComplete(files, metadata)) return null;
    if (link === null && phasegateSkillDirectoryLooksComplete(files, metadata)) return null;
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: ".claude/skills に phasegate skills がありません",
      repairMode: link === null || skillTargetLooksValid(link) ? "mechanical" : "manual",
    });
  }
}
