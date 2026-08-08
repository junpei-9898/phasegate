// @unit installation
// @layer presentation
// @work-item-id WI-145
// @work-item-id WI-178
// @work-item-id WI-179
// @work-item-id WI-180
// @work-item-id WI-208
// @work-item-id WI-330
// @work-item-id WI-384
// @work-item-id WI-385

import {
  ANTIGRAVITY_CLI_ONLY_NOTICE,
  CODEX_HOOK_TRUST_UNVERIFIABLE_NOTICE,
  GROK_HOOK_TRUST_UNVERIFIABLE_NOTICE,
  type OperatorNotice,
} from "../../application/operator-notice.js";
import type {
  DoctorAgentScope,
  ScopedOutDiagnosticFinding,
} from "../../application/usecases/run-doctor-diagnostics.js";
import type { ConfigStatus } from "../../domain/config-status.js";
import type { DiagnosticReport } from "../../domain/diagnostic-report.js";

export interface DiagnosticReportFormatterInput {
  readonly report: DiagnosticReport;
  readonly agent: DoctorAgentScope;
  readonly installationMode: "project" | "personal";
  readonly configStatus: ConfigStatus;
  readonly scopedOutFindings: readonly ScopedOutDiagnosticFinding[];
  readonly phasegateVersion: string;
  readonly projectRoot: string;
  readonly exitCode: number;
}

export class DiagnosticReportFormatter {
  formatJson(input: DiagnosticReportFormatterInput): string {
    const operatorNotices = noticesFor(input.agent);
    return JSON.stringify(
      {
        schemaVersion: "1.0",
        phasegateVersion: input.phasegateVersion,
        projectRoot: input.projectRoot,
        scope: {
          agent: input.agent,
          installationMode: input.installationMode,
          description: scopeDescription(input.agent, input.installationMode),
        },
        overallStatus: input.report.overallStatus,
        configStatus: input.configStatus,
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
        operatorNotices,
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
      `Scope: ${input.agent} / ${input.installationMode} (${scopeDescription(input.agent, input.installationMode)})`,
      `Config: ${input.configStatus}`,
      "",
    ];
    for (const notice of noticesFor(input.agent)) {
      lines.push(`Notice [${notice.code}]: ${notice.message}`, "");
    }
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
    lines.push(
      `Status: ${input.report.overallStatus.toUpperCase()} (${input.report.findings.length} findings: ${redCount} red, ${warnCount} warn)`,
    );
    if (input.scopedOutFindings.length > 0) {
      const checkIds = input.scopedOutFindings.map(({ finding }) => finding.checkId).join(", ");
      lines.push(
        `Scoped out: ${input.scopedOutFindings.length} informational findings not applicable to --agent ${input.agent}; not repair targets for this scope: ${checkIds}.`,
      );
    }
    lines.push(`Exit: ${input.exitCode}`);
    return lines.join("\n");
  }
}

function scopeDescription(agent: DoctorAgentScope, installationMode: "project" | "personal"): string {
  if (installationMode === "personal") {
    if (agent === "claude")
      return "Personal Claude Code sandbox; team/project Husky, CI, package, and Codex-only findings are not repair targets.";
    if (agent === "codex")
      return "Personal Codex sandbox; team/project Husky, CI, package, and Claude-only findings are not repair targets.";
    if (agent === "grok") return "Personal Grok-compatible hook diagnostics; external trust remains operator-verified.";
    if (agent === "antigravity") return "Personal Antigravity CLI hook diagnostics; IDE/desktop uses the L2 backstop.";
    if (agent === "all") return "Personal diagnostics for all supported runtime targets.";
    return "Personal sandbox diagnostics; team/project Husky, CI, and package findings are not repair targets.";
  }
  if (agent === "claude") return "Claude Code and shared setup targets; Codex-only findings are not applicable.";
  if (agent === "codex") return "Codex and shared setup targets; Claude-only findings are not applicable.";
  if (agent === "grok") return "Grok-compatible Claude hook diagnostics; other runtime findings are not applicable.";
  if (agent === "antigravity") return "Antigravity CLI hook diagnostics; other runtime findings are not applicable.";
  if (agent === "all") return "Full setup diagnostics for Claude, Codex, Grok, Antigravity, and shared targets.";
  return "Full setup diagnostics for Claude, Codex, and shared targets.";
}

function noticesFor(agent: DoctorAgentScope): readonly OperatorNotice[] {
  return [
    ...(agent === "codex" || agent === "both" || agent === "all" ? [CODEX_HOOK_TRUST_UNVERIFIABLE_NOTICE] : []),
    ...(agent === "grok" || agent === "all" ? [GROK_HOOK_TRUST_UNVERIFIABLE_NOTICE] : []),
    ...(agent === "antigravity" || agent === "all" ? [ANTIGRAVITY_CLI_ONLY_NOTICE] : []),
  ];
}
