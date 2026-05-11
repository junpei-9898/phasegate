// @unit installation
// @layer application
// @work-item-id WI-145

import { DiagnosticReport } from "../../domain/diagnostic-report.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { ManifestRepositoryPort } from "../ports/manifest-repository-port.js";

export interface RunDoctorDiagnosticsInput {
  readonly projectRoot: string;
  readonly strict: boolean;
}

export interface RunDoctorDiagnosticsOutput {
  readonly report: DiagnosticReport;
  readonly exitCode: number;
}

export class RunDoctorDiagnosticsUseCase {
  constructor(
    private readonly checks: readonly HeuristicCheck[],
    private readonly inspector: FileInspectorPort,
    private readonly manifestRepository: ManifestRepositoryPort,
  ) {}

  async execute(input: RunDoctorDiagnosticsInput): Promise<RunDoctorDiagnosticsOutput> {
    await this.manifestRepository.load(input.projectRoot).catch(() => null);
    const findings = (await Promise.all(
      this.checks.map((check) => check.run(input.projectRoot, this.inspector)),
    )).filter((finding) => finding !== null);
    const report = DiagnosticReport.create(findings);
    return {
      report,
      exitCode: this.decideExitCode(report, input.strict),
    };
  }

  private decideExitCode(report: DiagnosticReport, strict: boolean): number {
    if (report.hasRedFlag()) return 1;
    if (strict && report.hasWarning()) return 1;
    return 0;
  }
}
