// @unit installation
// @layer domain
// @work-item-id WI-145

import { DiagnosticFinding } from "./diagnostic-finding.js";

export type DiagnosticOverallStatus = "green" | "warn" | "red";

export class DiagnosticReport {
  readonly findings: readonly DiagnosticFinding[];
  readonly overallStatus: DiagnosticOverallStatus;

  private constructor(findings: readonly DiagnosticFinding[]) {
    const checkIds = new Set<string>();
    for (const finding of findings) {
      if (checkIds.has(finding.checkId)) {
        throw new Error(`DiagnosticReport contains duplicate checkId: ${finding.checkId}`);
      }
      checkIds.add(finding.checkId);
    }
    this.findings = Object.freeze([...findings]);
    this.overallStatus = this.deriveStatus();
    Object.freeze(this);
  }

  static create(findings: readonly DiagnosticFinding[]): DiagnosticReport {
    return new DiagnosticReport(findings);
  }

  hasRedFlag(): boolean {
    return this.findings.some((finding) => finding.severity === "red");
  }

  hasWarning(): boolean {
    return this.findings.some((finding) => finding.severity === "warn" || finding.repairMode !== "mechanical");
  }

  toJSON() {
    return {
      overallStatus: this.overallStatus,
      findings: this.findings.map((finding) => finding.toJSON()),
    };
  }

  private deriveStatus(): DiagnosticOverallStatus {
    if (this.findings.some((finding) => finding.severity === "red")) return "red";
    if (this.findings.some((finding) => finding.severity === "warn" || finding.repairMode !== "mechanical")) {
      return "warn";
    }
    return "green";
  }
}
