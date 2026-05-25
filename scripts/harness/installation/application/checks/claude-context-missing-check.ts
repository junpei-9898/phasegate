// @unit installation
// @layer application
// @work-item-id WI-215

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, projectPath } from "./check-utils.js";

const MARKDOWN_BEGIN = "<!-- phasegate:managed-section:start -->";

export class ClaudeContextMissingCheck implements HeuristicCheck {
  readonly checkId = "claude-context-missing" as const;
  private readonly target = ".claude/CLAUDE.md";
  private readonly projectTarget = "CLAUDE.md";
  private readonly legacyTarget = ".claude/CLAUDE.local.md";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const content = await inspector.readText(projectPath(projectRoot, this.target));
    if (content?.includes(MARKDOWN_BEGIN) === true && content.includes("PhaseGate")) return null;
    const projectContent = await inspector.readText(projectPath(projectRoot, this.projectTarget));
    if (projectContent?.includes(MARKDOWN_BEGIN) === true && projectContent.includes("PhaseGate")) return null;

    const legacyContent = await inspector.readText(projectPath(projectRoot, this.legacyTarget));
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: legacyContent?.includes("PhaseGate") === true
        ? ".claude/CLAUDE.local.md は Claude Code の documented discovery path ではありません"
        : ".claude/CLAUDE.md に runtime-visible PhaseGate context がありません",
      repairMode: "mechanical",
    });
  }
}
