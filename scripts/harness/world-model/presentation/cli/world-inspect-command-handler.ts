// @unit world-model
// @layer presentation
// @work-item-id WI-291

import type {
  WorldExtractionDiagnosticDto,
  WorldInspectionDto,
  WorldJsonObject,
} from "../../application/dto/world-inspection-dto.js";
import type { InspectWorldContract } from "../../application/usecases/inspect-world-use-case.js";

export interface WorldInspectCommandResult {
  readonly exitCode: 0 | 1 | 2;
  readonly stdout: string;
  readonly stderr: string;
}

export interface WorldInspectCommandHandlerDeps {
  readonly inspectWorld: InspectWorldContract;
}

type OutputFormat = "human" | "json";

interface ParsedFlags {
  readonly ok: true;
  readonly format: OutputFormat;
}

interface FlagFailure {
  readonly ok: false;
  readonly message: string;
  readonly format: OutputFormat;
}

const executionDiagnostic = (message: string): WorldExtractionDiagnosticDto => ({
  code: "world-inspect-execution-failure",
  line: null,
  nodeId: null,
  pathKey: null,
  payload: { message },
});

export class WorldInspectCommandHandler {
  constructor(private readonly deps: WorldInspectCommandHandlerDeps) {}

  static fromFailure(error: unknown): WorldInspectCommandHandler {
    return new WorldInspectCommandHandler({
      inspectWorld: {
        execute: async () => {
          throw error;
        },
      },
    });
  }

  async execute(args: readonly string[]): Promise<WorldInspectCommandResult> {
    const parsed = this.parseFlags(args);
    if (!parsed.ok) return this.renderFailure(parsed.format, parsed.message, "invalid-invocation");
    try {
      const inspection = await this.deps.inspectWorld.execute();
      const exitCode = inspection.summary.hardDiagnosticCount > 0 ? 1 : 0;
      if (parsed.format === "json") {
        return {
          exitCode,
          stdout: `${JSON.stringify(this.envelope(inspection, exitCode))}\n`,
          stderr: "",
        };
      }
      return {
        exitCode,
        stdout: this.renderHuman(inspection),
        stderr: "",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.renderFailure(parsed.format, message, "world-inspect-execution-failure");
    }
  }

  private parseFlags(args: readonly string[]): ParsedFlags | FlagFailure {
    let explicitFormat: OutputFormat | undefined;
    let jsonAlias = false;
    for (let index = 0; index < args.length; index += 1) {
      const argument = args[index];
      if (argument === "--json") {
        jsonAlias = true;
        continue;
      }
      if (argument === "--format") {
        const value = args[index + 1];
        if (value !== "human" && value !== "json") {
          return {
            ok: false,
            message: "--format requires human or json",
            format: jsonAlias ? "json" : "human",
          };
        }
        if (explicitFormat !== undefined && explicitFormat !== value) {
          return { ok: false, message: "conflicting output format flags", format: jsonAlias ? "json" : "human" };
        }
        explicitFormat = value;
        index += 1;
        continue;
      }
      return {
        ok: false,
        message: `unknown argument: ${argument}`,
        format: jsonAlias || explicitFormat === "json" ? "json" : "human",
      };
    }
    if (jsonAlias && explicitFormat === "human") {
      return { ok: false, message: "conflicting output format flags", format: "human" };
    }
    return { ok: true, format: jsonAlias || explicitFormat === "json" ? "json" : "human" };
  }

  private envelope(
    data: WorldInspectionDto | null,
    exitCode: 0 | 1 | 2,
    diagnostics?: readonly WorldExtractionDiagnosticDto[],
  ): WorldJsonObject {
    return {
      schemaVersion: "phasegate-world-cli/v1",
      command: "world:inspect",
      ok: exitCode === 0,
      exitCode,
      data: data as unknown as WorldJsonObject | null,
      diagnostics: diagnostics ?? data?.diagnostics ?? [],
    };
  }

  private renderFailure(
    format: OutputFormat,
    message: string,
    code: "invalid-invocation" | "world-inspect-execution-failure",
  ): WorldInspectCommandResult {
    if (format === "json") {
      const diagnostic: WorldExtractionDiagnosticDto = {
        ...executionDiagnostic(message),
        code,
      };
      return {
        exitCode: 2,
        stdout: `${JSON.stringify(this.envelope(null, 2, [diagnostic]))}\n`,
        stderr: "",
      };
    }
    return {
      exitCode: 2,
      stdout: "",
      stderr:
        code === "invalid-invocation"
          ? `world:inspect usage error: ${message}\n`
          : `world:inspect failed: ${message}\n`,
    };
  }

  private renderHuman(inspection: WorldInspectionDto): string {
    const lines = [
      "World Snapshot",
      `  snapshotId: ${inspection.snapshotId}`,
      `  corpusRoot: ${inspection.corpusRoot}`,
      `  nodes: ${inspection.summary.nodeCount}`,
      `  edges: ${inspection.summary.edgeCount}`,
      `  diagnostics: ${inspection.summary.diagnosticCount} (hard: ${inspection.summary.hardDiagnosticCount})`,
      "",
      "Inventory",
      `  nodeTypes: ${this.renderCounts(inspection.inventory.nodeTypes)}`,
      `  corpusRoles: ${this.renderCounts(inspection.inventory.corpusRoles)}`,
      `  artifactKinds: ${this.renderCounts(inspection.inventory.artifactKinds)}`,
      "",
      "Diagnostics",
      ...(inspection.diagnostics.length === 0
        ? ["  none"]
        : inspection.diagnostics.map(
            (diagnostic) =>
              `  ${diagnostic.code} ${diagnostic.nodeId ?? diagnostic.pathKey ?? "<global>"}${
                diagnostic.line === null ? "" : `:${diagnostic.line}`
              }`,
          )),
      "",
      "Next action",
      inspection.summary.hardDiagnosticCount > 0
        ? "  Resolve hard extraction diagnostics and rerun phasegate world:inspect."
        : "  Snapshot is inspectable; no hard extraction diagnostics were found.",
      "",
    ];
    return lines.join("\n");
  }

  private renderCounts(values: readonly { value: string; count: number }[]): string {
    return values.length === 0 ? "none" : values.map((entry) => `${entry.value}=${entry.count}`).join(", ");
  }
}
