// @unit installation
// @layer presentation
// @work-item-id WI-145

import type { DiagnosticReport } from "../../domain/diagnostic-report.js";

export interface DiagnosticReportFormatterInput {
  readonly report: DiagnosticReport;
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
        overallStatus: input.report.overallStatus,
        findings: input.report.findings.map((finding) => finding.toJSON()),
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
    lines.push(`Exit: ${input.exitCode}`);
    return lines.join("\n");
  }
}
