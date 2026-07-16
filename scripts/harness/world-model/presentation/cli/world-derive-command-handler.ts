// @unit world-model
// @layer presentation
// @work-item-id WI-296

import type { DeriveWorldObligationsUseCase } from "../../application/usecases/derive-world-obligations-use-case.js";
import { PathKey } from "../../domain/value-objects/path-key.js";
import { envelope, parseFormat, type WorldCommandResult, type WorldOutputFormat } from "./world-command-support.js";

export class WorldDeriveCommandHandler {
  constructor(private readonly useCase: Pick<DeriveWorldObligationsUseCase, "execute">) {}

  static fromFailure(error: unknown): WorldDeriveCommandHandler {
    return new WorldDeriveCommandHandler({
      execute: async () => {
        throw error;
      },
    });
  }

  async execute(args: readonly string[]): Promise<WorldCommandResult> {
    const formatted = parseFormat(args);
    if (!formatted.ok) return this.failure(formatted.format, formatted.message);
    let writeReport = false;
    let reportPath: string | undefined;
    for (let index = 0; index < formatted.rest.length; index += 1) {
      const argument = formatted.rest[index];
      if (argument === "--write") writeReport = true;
      else if (argument === "--out") reportPath = formatted.rest[++index];
      else return this.failure(formatted.format, `unknown argument: ${argument}`);
    }
    if (reportPath !== undefined && !writeReport) return this.failure(formatted.format, "--out requires --write");
    if (reportPath !== undefined) {
      try {
        reportPath = PathKey.create(reportPath).toString();
      } catch {
        return this.failure(formatted.format, "--out must be a project-relative path");
      }
    }
    try {
      const result = await this.useCase.execute({ writeReport, reportPath });
      if (result.status === "execution-failure") {
        return this.executionFailure(formatted.format, result.diagnostics);
      }
      const report = result.result.report;
      if (result.result.persistence.state === "failed") {
        return this.executionFailure(formatted.format, [
          { code: "report-write-failure", message: result.result.persistence.message },
        ]);
      }
      const hasFinding =
        report.structuralObligations.some(
          (item) => item.classification === "new-structural" || item.classification === "invalid-declaration",
        ) ||
        report.repaidBaselineEntries.length > 0 ||
        report.policyDiagnostics.length > 0;
      const exitCode = hasFinding ? 1 : 0;
      const data = {
        report,
        persistence: result.result.persistence,
        writtenPath: writeReport ? (reportPath ?? ".harness/world-obligations.json") : null,
      };
      if (formatted.format === "json") {
        return {
          exitCode,
          stdout: `${JSON.stringify(envelope("world:derive", exitCode, data, report.policyDiagnostics))}\n`,
          stderr: "",
        };
      }
      return {
        exitCode,
        stdout: [
          "World Obligations",
          `  evaluationId: ${report.evaluationId}`,
          `  structural: ${report.summary.structuralObligations}`,
          `  repaid: ${report.summary.repaidBaselineEntries}`,
          `  semantic debts: ${report.summary.declaredSemanticDebts}`,
          `  policy diagnostics: ${report.summary.policyDiagnostics}`,
          `  persistence: ${result.result.persistence.state}`,
          ...(writeReport ? [`  writtenPath: ${data.writtenPath}`] : []),
          "",
        ].join("\n"),
        stderr: "",
      };
    } catch (error) {
      return this.failure(formatted.format, error instanceof Error ? error.message : String(error), true);
    }
  }

  private executionFailure(format: WorldOutputFormat, diagnostics: readonly unknown[]): WorldCommandResult {
    return format === "json"
      ? { exitCode: 2, stdout: `${JSON.stringify(envelope("world:derive", 2, null, diagnostics))}\n`, stderr: "" }
      : { exitCode: 2, stdout: "", stderr: `world:derive failed: ${JSON.stringify(diagnostics)}\n` };
  }

  private failure(format: WorldOutputFormat, message: string, execution = false): WorldCommandResult {
    const code = execution ? "world-derive-execution-failure" : "invalid-invocation";
    return format === "json"
      ? {
          exitCode: 2,
          stdout: `${JSON.stringify(envelope("world:derive", 2, null, [{ code, message }]))}\n`,
          stderr: "",
        }
      : { exitCode: 2, stdout: "", stderr: `world:derive ${execution ? "failed" : "usage error"}: ${message}\n` };
  }
}
