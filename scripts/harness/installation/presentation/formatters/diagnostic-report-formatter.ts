// @unit installation
// @layer presentation
// @work-item-id WI-145
// @work-item-id WI-178
// @work-item-id WI-179
// @work-item-id WI-180

import type { DoctorAgentScope, ScopedOutDiagnosticFinding } from "../../application/usecases/run-doctor-diagnostics.js";
import type { DiagnosticReport } from "../../domain/diagnostic-report.js";

export interface DiagnosticReportFormatterInput {
  readonly report: DiagnosticReport;
  readonly agent: DoctorAgentScope;
  readonly scopedOutFindings: readonly ScopedOutDiagnosticFinding[];
  readonly phasegateVersion: string;
  readonly projectRoot: string;
  readonly exitCode: number;
}

export class DiagnosticReportFormatter {
  formatJson(input: DiagnosticReportFormatterInput): string {
    return JSON.stringify(
      {
        schemaVersion: "1.0",
        phasegateVersion: input.phasegateVersion,
        projectRoot: input.projectRoot,
        scope: {
          agent: input.agent,
          description: scopeDescription(input.agent),
        },
        overallStatus: input.report.overallStatus,
        findings: input.report.findings.map((finding) => ({
          ...finding.toJSON(),
          applicability: "applicable",
          currentScopeRepairTarget: true,
          repairHintApplicability: "applicable",
          repairModeApplicability: "applicable",
        })),
        scopedOutFindings: input.scopedOutFindings.map(({ finding, scopeReason }) => {
          const json = finding.toJSON();
          return {
            ...json,
            repairHint: null,
            suggestedSkill: null,
            applicability: "not-applicable",
            currentScopeRepairTarget: false,
            repairHintApplicability: "only-if-agent-selected",
            repairModeApplicability: "only-if-agent-selected",
            scopeReason,
          };
        }),
        exitCode: input.exitCode,
      },
      null,
      2,
    );
  }

  formatHuman(input: DiagnosticReportFormatterInput): string {
    const lines = [
      `phasegate doctor v${input.phasegateVersion}`,
      `Project: ${input.projectRoot}`,
      `Scope: ${input.agent} (${scopeDescription(input.agent)})`,
      "",
    ];
    for (const finding of input.report.findings) {
      lines.push(`[${finding.severity}] ${finding.checkId}: ${finding.message}`);
      lines.push(`  target: ${finding.target}`);
      lines.push(`  repairMode: ${finding.repairMode}`);
      if (finding.repairHint !== null) lines.push(`  fix: ${finding.repairHint}`);
      if (finding.suggestedSkill !== null) {
        lines.push(`  suggested: ${finding.suggestedSkill.skillName} (${finding.suggestedSkill.invokeCommand})`);
        lines.push(`  rationale: ${finding.suggestedSkill.rationale}`);
      }
      lines.push("");
    }
    const redCount = input.report.findings.filter((finding) => finding.severity === "red").length;
    const warnCount = input.report.findings.filter((finding) => finding.severity === "warn").length;
    lines.push(`Status: ${input.report.overallStatus.toUpperCase()} (${input.report.findings.length} findings: ${redCount} red, ${warnCount} warn)`);
    if (input.scopedOutFindings.length > 0) {
      const checkIds = input.scopedOutFindings.map(({ finding }) => finding.checkId).join(", ");
      lines.push(`Scoped out: ${input.scopedOutFindings.length} informational findings not applicable to --agent ${input.agent}; not repair targets for this scope: ${checkIds}.`);
    }
    lines.push(`Exit: ${input.exitCode}`);
    return lines.join("\n");
  }
}

function scopeDescription(agent: DoctorAgentScope): string {
  if (agent === "claude") return "Claude Code and shared setup targets; Codex-only findings are not applicable.";
  if (agent === "codex") return "Codex and shared setup targets; Claude-only findings are not applicable.";
  return "Full setup diagnostics for Claude, Codex, and shared targets.";
}
