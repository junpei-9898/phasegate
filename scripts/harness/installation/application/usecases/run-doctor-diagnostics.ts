// @unit installation
// @layer application
// @work-item-id WI-145
// @work-item-id WI-178
// @work-item-id WI-208
// @work-item-id WI-215
// @work-item-id WI-330
// @work-item-id WI-343
// @work-item-id WI-385
// @work-item-id WI-390

import type { AgentTarget } from "../../domain/agent-target.js";
import type { CheckId } from "../../domain/check-id.js";
import type { ConfigStatus } from "../../domain/config-status.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { DiagnosticReport } from "../../domain/diagnostic-report.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { ConfigStatusProbePort } from "../ports/config-status-probe-port.js";
import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { ManifestRepositoryPort } from "../ports/manifest-repository-port.js";

export type DoctorAgentScope = AgentTarget;

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
const CLAUDE_COMPATIBLE_CHECKS = new Set<CheckId>(["grok-hook-missing"]);
const ANTIGRAVITY_ONLY_CHECKS = new Set<CheckId>(["antigravity-hook-missing"]);
const PERSONAL_SCOPED_OUT_CHECKS = new Set<CheckId>([
  "husky-pre-commit-missing",
  "husky-commit-msg-missing",
  "husky-pre-push-missing",
  "husky-runtime-inactive",
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
      await Promise.all(this.checks.map((check) => check.run(input.projectRoot, this.inspector, { installationMode })))
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
    const applicable: DiagnosticFinding[] = [];
    const scopedOut: ScopedOutDiagnosticFinding[] = [];
    for (const finding of findings) {
      if (!this.isApplicableAgentCheck(finding.checkId, agent)) {
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

  private isApplicableAgentCheck(checkId: CheckId, agent: DoctorAgentScope): boolean {
    if (CLAUDE_ONLY_CHECKS.has(checkId)) return agent === "claude" || agent === "both" || agent === "all";
    if (CODEX_ONLY_CHECKS.has(checkId)) return agent === "codex" || agent === "both" || agent === "all";
    if (CLAUDE_COMPATIBLE_CHECKS.has(checkId))
      return agent === "claude" || agent === "both" || agent === "grok" || agent === "all";
    if (ANTIGRAVITY_ONLY_CHECKS.has(checkId)) return agent === "antigravity" || agent === "all";
    return true;
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
