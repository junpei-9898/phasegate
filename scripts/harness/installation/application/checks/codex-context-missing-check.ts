// @unit installation
// @layer application
// @work-item-id WI-215

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, projectPath } from "./check-utils.js";

const MARKDOWN_BEGIN = "<!-- phasegate:managed-section:start -->";

export class CodexContextMissingCheck implements HeuristicCheck {
  readonly checkId = "codex-context-missing" as const;
  private readonly target = "AGENTS.md";
  private readonly legacyTarget = ".codex/AGENTS.local.md";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const content = await inspector.readText(projectPath(projectRoot, this.target));
    if (content?.includes(MARKDOWN_BEGIN) === true && content.includes("PhaseGate")) return null;

    const legacyContent = await inspector.readText(projectPath(projectRoot, this.legacyTarget));
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: legacyContent?.includes("PhaseGate") === true
        ? ".codex/AGENTS.local.md は Codex の default discovery path ではありません"
        : "AGENTS.md に runtime-visible PhaseGate context がありません",
      repairMode: content === null ? "mechanical" : "manual",
    });
  }
}
