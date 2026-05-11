// @unit installation
// @layer application
// @work-item-id WI-143

import { join, relative, sep } from "node:path";
import { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { FileInspectorPort } from "../ports/file-inspector-port.js";

interface PhasegateConfigProbe {
  readonly quickMode?: {
    readonly relaxedGates?: readonly string[];
  };
}

export class WiWorkflowDriftCheck implements HeuristicCheck {
  readonly checkId = "wi-workflow-drift" as const;

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const inceptionRoot = join(projectRoot, "docs", "inception");
    const files = await inspector.listFiles(inceptionRoot);
    const relativeFiles = files.map((file) => toPosix(relative(projectRoot, file)));
    const workItemCount = relativeFiles.filter(isWorkItemDescription).length;
    const adHocPlans = relativeFiles.filter(isAdHocPlan);
    const hasPhaseGateRelaxed = await this.hasRelaxedPhaseGate(projectRoot, inspector);

    if (workItemCount > 0 || adHocPlans.length === 0) {
      return null;
    }

    const message = hasPhaseGateRelaxed
      ? `WI-first drift detected: 0 WI directories, ${adHocPlans.length} ad-hoc plan file(s), and quickMode.relaxedGates includes phase-gate.`
      : `WI-first drift detected: 0 WI directories and ${adHocPlans.length} ad-hoc plan file(s).`;

    return DiagnosticFinding.create({
      checkId: this.checkId,
      severity: "red",
      target: "docs/inception",
      message,
      repairMode: "mechanical",
      repairHint: "phasegate migrate work-items --apply",
      suggestedSkill: null,
    });
  }

  private async hasRelaxedPhaseGate(projectRoot: string, inspector: FileInspectorPort): Promise<boolean> {
    const config = await inspector.readJson<PhasegateConfigProbe>(join(projectRoot, "phasegate.config.json"));
    return config?.quickMode?.relaxedGates?.includes("phase-gate") ?? false;
  }
}

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

function isWorkItemDescription(path: string): boolean {
  return /^docs\/inception\/(?:_cross|[^/]+)\/WI-\d{3}\/description\.md$/.test(path);
}

function isAdHocPlan(path: string): boolean {
  if (!path.startsWith("docs/inception/")) return false;
  if (/\/WI-\d{3}\//.test(path)) return false;
  return path.includes("/codding_plan/") || path.endsWith("_plan.md");
}
