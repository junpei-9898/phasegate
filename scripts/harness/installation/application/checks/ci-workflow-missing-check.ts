// @unit installation
// @layer application
// @work-item-id WI-145

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, projectPath } from "./check-utils.js";

export class CiWorkflowMissingCheck implements HeuristicCheck {
  readonly checkId = "ci-workflow-missing" as const;
  private readonly target = ".github/workflows/";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const files = await inspector.listFiles(projectPath(projectRoot, this.target));
    const hasPhasegateWorkflow = files.some((file) => {
      const normalized = file.toLowerCase();
      return normalized.includes("phasegate") || normalized.includes("aidlc-gate") || normalized.includes("consistency-check");
    });
    if (hasPhasegateWorkflow) return null;
    return createFinding({
      checkId: this.checkId,
      severity: "warn",
      target: this.target,
      message: ".github/workflows/ に phasegate workflow がありません",
      repairMode: "manual",
    });
  }
}
