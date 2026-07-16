// @unit world-model
// @layer presentation
// @work-item-id WI-296

import type {
  PinConstraintEndpointResult,
  PinConstraintEndpointUseCase,
  PinEndpointRole,
} from "../../application/usecases/pin-constraint-endpoint-use-case.js";
import { envelope, parseFormat, type WorldCommandResult, type WorldOutputFormat } from "./world-command-support.js";

export class WorldPinCommandHandler {
  constructor(private readonly useCase: Pick<PinConstraintEndpointUseCase, "execute">) {}

  static fromFailure(error: unknown): WorldPinCommandHandler {
    return new WorldPinCommandHandler({
      execute: async () => {
        throw error;
      },
    });
  }

  async execute(args: readonly string[]): Promise<WorldCommandResult> {
    const formatted = parseFormat(args);
    if (!formatted.ok) return this.failure(formatted.format, formatted.message);
    let constraintId: string | undefined;
    let endpoint: PinEndpointRole | undefined;
    let apply = false;
    for (let index = 0; index < formatted.rest.length; index += 1) {
      const argument = formatted.rest[index];
      if (argument === "--apply") apply = true;
      else if (argument === "--constraint") constraintId = formatted.rest[++index];
      else if (argument === "--endpoint") {
        const value = formatted.rest[++index];
        if (value !== "claimant" && value !== "premise")
          return this.failure(formatted.format, "--endpoint requires claimant or premise");
        endpoint = value;
      } else return this.failure(formatted.format, `unknown argument: ${argument}`);
    }
    if (!constraintId || !/^pgw:v1:constraint:.+/.test(constraintId)) {
      return this.failure(formatted.format, "--constraint requires a pgw:v1:constraint ID");
    }
    if (!endpoint) return this.failure(formatted.format, "--endpoint is required");
    try {
      const result = await this.useCase.execute({ constraintId, endpoint, apply });
      return this.render(formatted.format, result);
    } catch (error) {
      return this.failure(formatted.format, error instanceof Error ? error.message : String(error), true);
    }
  }

  private render(format: WorldOutputFormat, result: PinConstraintEndpointResult): WorldCommandResult {
    const exitCode = result.status === "execution-failure" ? 2 : result.status === "domain-failure" ? 1 : 0;
    const diagnostics =
      result.status === "execution-failure"
        ? result.diagnostics
        : result.status === "domain-failure"
          ? [{ code: result.code, message: result.message }]
          : [];
    if (format === "json") {
      return {
        exitCode,
        stdout: `${JSON.stringify(envelope("world:pin", exitCode, result, diagnostics))}\n`,
        stderr: "",
      };
    }
    if (result.status === "execution-failure") {
      return {
        exitCode: 2,
        stdout: "",
        stderr: `world:pin failed: ${result.diagnostics[0]?.message ?? "execution failure"}\n`,
      };
    }
    if (result.status === "domain-failure") {
      return { exitCode: 1, stdout: `World Pin\n  status: ${result.code}\n  message: ${result.message}\n`, stderr: "" };
    }
    return {
      exitCode: 0,
      stdout: [
        "World Pin",
        `  status: ${result.status}`,
        `  constraintId: ${result.candidate.constraintId}`,
        `  endpoint: ${result.candidate.endpoint}`,
        `  nodeId: ${result.candidate.nodeId}`,
        `  before: ${result.candidate.beforeDigest}`,
        `  after: ${result.candidate.afterDigest}`,
        `  changed: ${result.candidate.changed}`,
        "",
      ].join("\n"),
      stderr: "",
    };
  }

  private failure(format: WorldOutputFormat, message: string, execution = false): WorldCommandResult {
    const code = execution ? "world-pin-execution-failure" : "invalid-invocation";
    return format === "json"
      ? { exitCode: 2, stdout: `${JSON.stringify(envelope("world:pin", 2, null, [{ code, message }]))}\n`, stderr: "" }
      : { exitCode: 2, stdout: "", stderr: `world:pin ${execution ? "failed" : "usage error"}: ${message}\n` };
  }
}
