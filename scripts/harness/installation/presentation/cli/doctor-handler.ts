// @unit installation
// @layer presentation
// @work-item-id WI-145
// @work-item-id WI-178
// @work-item-id WI-208
// @work-item-id WI-330

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import type {
  DoctorAgentScope,
  RunDoctorDiagnosticsUseCase,
} from "../../application/usecases/run-doctor-diagnostics.js";
import { DiagnosticReportFormatter } from "../formatters/diagnostic-report-formatter.js";

export interface DoctorHandlerInput {
  readonly projectRoot: string;
  readonly strict: boolean;
  readonly json: boolean;
  readonly reportOut: string | null;
  readonly phasegateVersion: string;
  readonly agent?: DoctorAgentScope;
}

export interface DoctorHandlerOutput {
  readonly stdout: string;
  readonly exitCode: number;
}

export class DoctorHandler {
  constructor(
    private readonly useCase: RunDoctorDiagnosticsUseCase,
    private readonly formatter = new DiagnosticReportFormatter(),
  ) {}

  async execute(input: DoctorHandlerInput): Promise<DoctorHandlerOutput> {
    const result = await this.useCase.execute({
      projectRoot: input.projectRoot,
      strict: input.strict,
      agent: input.agent,
    });
    const formatInput = {
      report: result.report,
      agent: result.agent,
      installationMode: result.installationMode,
      configStatus: result.configStatus,
      scopedOutFindings: result.scopedOutFindings,
      phasegateVersion: input.phasegateVersion,
      projectRoot: input.projectRoot,
      exitCode: result.exitCode,
    };
    const jsonOutput = this.formatter.formatJson(formatInput);
    if (input.reportOut !== null) {
      const reportPath = isAbsolute(input.reportOut) ? input.reportOut : join(input.projectRoot, input.reportOut);
      await mkdir(dirname(reportPath), { recursive: true });
      await writeFile(reportPath, `${jsonOutput}\n`, "utf8");
    }
    return {
      stdout: input.json ? jsonOutput : this.formatter.formatHuman(formatInput),
      exitCode: result.exitCode,
    };
  }
}
