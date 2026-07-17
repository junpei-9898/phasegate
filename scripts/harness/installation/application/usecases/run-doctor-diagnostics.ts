// @unit installation
// @layer application
// @work-item-id WI-145
// @work-item-id WI-178
// @work-item-id WI-208
// @work-item-id WI-215
// @work-item-id WI-330

import type { CheckId } from "../../domain/check-id.js";
import type { ConfigStatus } from "../../domain/config-status.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { DiagnosticReport } from "../../domain/diagnostic-report.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { ConfigStatusProbePort } from "../ports/config-status-probe-port.js";
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
  readonly installationMode: "project" | "personal";
  readonly configStatus: ConfigStatus;
  readonly scopedOutFindings: readonly ScopedOutDiagnosticFinding[];
  readonly exitCode: number;
}

const CLAUDE_ONLY_CHECKS = new Set<CheckId>(["claude-hook-missing", "claude-context-missing", "claude-skills-symlink"]);
const CODEX_ONLY_CHECKS = new Set<CheckId>(["codex-hook-missing", "codex-context-missing", "codex-skills-symlink"]);
const PERSONAL_SCOPED_OUT_CHECKS = new Set<CheckId>([
  "husky-pre-commit-missing",
  "husky-commit-msg-missing",
  "husky-pre-push-missing",
  "ci-workflow-missing",
  "package-json-devdep-missing",
]);

export class RunDoctorDiagnosticsUseCase {
  constructor(
    private readonly checks: readonly HeuristicCheck[],
    private readonly inspector: FileInspectorPort,
    private readonly manifestRepository: ManifestRepositoryPort,
    private readonly configStatusProbe: ConfigStatusProbePort,
  ) {}

  async execute(input: RunDoctorDiagnosticsInput): Promise<RunDoctorDiagnosticsOutput> {
    const agent = input.agent ?? "both";
    const manifest = await this.manifestRepository.load(input.projectRoot).catch(() => null);
    const installationMode =
      manifest?.findEntry(".phasegate-local/phasegate.config.json") !== null && manifest !== null
        ? "personal"
        : "project";
    const configStatus = (await this.configStatusProbe.probe(input.projectRoot)).status;
    const rawFindings = (
      await Promise.all(this.checks.map((check) => check.run(input.projectRoot, this.inspector)))
    ).filter((finding) => finding !== null);
    const { findings, scopedOutFindings } = this.applyPersonalScope(
      this.applyAgentScope(rawFindings, agent),
      installationMode,
    );
    const report = DiagnosticReport.create(findings);
    return {
      report,
      agent,
      installationMode,
      configStatus,
      scopedOutFindings,
      exitCode: this.decideExitCode(report, input.strict),
    };
  }

  private applyAgentScope(
    findings: readonly DiagnosticFinding[],
    agent: DoctorAgentScope,
  ): {
    readonly findings: readonly DiagnosticFinding[];
    readonly scopedOutFindings: readonly ScopedOutDiagnosticFinding[];
  } {
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

  private applyPersonalScope(
    scoped: {
      readonly findings: readonly DiagnosticFinding[];
      readonly scopedOutFindings: readonly ScopedOutDiagnosticFinding[];
    },
    installationMode: "project" | "personal",
  ): {
    readonly findings: readonly DiagnosticFinding[];
    readonly scopedOutFindings: readonly ScopedOutDiagnosticFinding[];
  } {
    if (installationMode !== "personal") return scoped;
    const applicable: DiagnosticFinding[] = [];
    const scopedOut: ScopedOutDiagnosticFinding[] = [...scoped.scopedOutFindings];
    for (const finding of scoped.findings) {
      if (PERSONAL_SCOPED_OUT_CHECKS.has(finding.checkId)) {
        scopedOut.push({
          finding,
          scopeReason: `${finding.checkId} is a team/project install target and is intentionally out of scope for personal install.`,
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
