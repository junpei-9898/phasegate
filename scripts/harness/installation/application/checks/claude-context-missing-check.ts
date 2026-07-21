// @unit installation
// @layer application
// @work-item-id WI-215
// @work-item-id WI-343

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck, HeuristicCheckContext } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, projectPath } from "./check-utils.js";

const MARKDOWN_BEGIN = "<!-- phasegate:managed-section:start -->";

export class ClaudeContextMissingCheck implements HeuristicCheck {
  readonly checkId = "claude-context-missing" as const;
  private readonly target = ".claude/CLAUDE.md";
  private readonly projectTarget = "CLAUDE.md";
  private readonly legacyTarget = ".claude/CLAUDE.local.md";

  async run(
    projectRoot: string,
    inspector: FileInspectorPort,
    context?: HeuristicCheckContext,
  ): Promise<DiagnosticFinding | null> {
    const content = await inspector.readText(projectPath(projectRoot, this.target));
    if (content?.includes(MARKDOWN_BEGIN) === true && /phasegate/i.test(content)) return null;
    const projectContent = await inspector.readText(projectPath(projectRoot, this.projectTarget));
    if (projectContent?.includes(MARKDOWN_BEGIN) === true && /phasegate/i.test(projectContent)) return null;

    const legacyContent = await inspector.readText(projectPath(projectRoot, this.legacyTarget));
    const target = context?.installationMode === "project" ? this.projectTarget : this.target;
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target,
      message: legacyContent !== null && /phasegate/i.test(legacyContent)
        ? ".claude/CLAUDE.local.md は Claude Code の documented discovery path ではありません"
        : `${target} に runtime-visible PhaseGate context がありません`,
      repairMode: "mechanical",
    });
  }
}
