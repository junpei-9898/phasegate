// @unit installation
// @layer application
// @work-item-id WI-145
// @work-item-id WI-178

import { DiagnosticReport } from "../../domain/diagnostic-report.js";
import type { CheckId } from "../../domain/check-id.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { ManifestRepositoryPort } from "../ports/manifest-repository-port.js";

export type DoctorAgentScope = "claude" | "codex" | "both";

export interface ScopedOutDiagnosticFinding {
  readonly finding: DiagnosticFinding;
  readonly scopeReason: string;
}

export interface RunDoctorDiagnosticsInput {
  readonly projectRoot: string;
  readonly strict: boolean;
  readonly agent?: DoctorAgentScope;
}

export interface RunDoctorDiagnosticsOutput {
  readonly report: DiagnosticReport;
  readonly agent: DoctorAgentScope;
  readonly scopedOutFindings: readonly ScopedOutDiagnosticFinding[];
  readonly exitCode: number;
}

const CLAUDE_ONLY_CHECKS = new Set<CheckId>(["claude-hook-missing", "claude-skills-symlink"]);
const CODEX_ONLY_CHECKS = new Set<CheckId>(["codex-hook-missing", "codex-skills-symlink"]);

export class RunDoctorDiagnosticsUseCase {
  constructor(
    private readonly checks: readonly HeuristicCheck[],
    private readonly inspector: FileInspectorPort,
    private readonly manifestRepository: ManifestRepositoryPort,
  ) {}

  async execute(input: RunDoctorDiagnosticsInput): Promise<RunDoctorDiagnosticsOutput> {
    const agent = input.agent ?? "both";
    await this.manifestRepository.load(input.projectRoot).catch(() => null);
    const rawFindings = (await Promise.all(
      this.checks.map((check) => check.run(input.projectRoot, this.inspector)),
    )).filter((finding) => finding !== null);
    const { findings, scopedOutFindings } = this.applyAgentScope(rawFindings, agent);
    const report = DiagnosticReport.create(findings);
    return {
      report,
      agent,
      scopedOutFindings,
      exitCode: this.decideExitCode(report, input.strict),
    };
  }

  private applyAgentScope(
    findings: readonly DiagnosticFinding[],
    agent: DoctorAgentScope,
  ): { readonly findings: readonly DiagnosticFinding[]; readonly scopedOutFindings: readonly ScopedOutDiagnosticFinding[] } {
    if (agent === "both") return { findings, scopedOutFindings: [] };
    const scopedOutChecks = agent === "claude" ? CODEX_ONLY_CHECKS : CLAUDE_ONLY_CHECKS;
    const applicable: DiagnosticFinding[] = [];
    const scopedOut: ScopedOutDiagnosticFinding[] = [];
    for (const finding of findings) {
      if (scopedOutChecks.has(finding.checkId)) {
        scopedOut.push({
          finding,
          scopeReason: `${finding.checkId} belongs to an unselected agent for doctor --agent ${agent}.`,
        });
      } else {
        applicable.push(finding);
      }
    }
    return { findings: applicable, scopedOutFindings: scopedOut };
  }

  private decideExitCode(report: DiagnosticReport, strict: boolean): number {
    if (report.hasRedFlag()) return 1;
    if (strict && report.hasWarning()) return 1;
    return 0;
  }
}
