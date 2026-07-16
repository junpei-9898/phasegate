// @unit world-model
// @layer test
// @work-item-id WI-291
// @story H17-06

import { describe, expect, it } from "vitest";
import type { WorldInspectionDto } from "../../../../world-model/application/dto/world-inspection-dto.js";
import { WorldInspectCommandHandler } from "../../../../world-model/presentation/cli/world-inspect-command-handler.js";

const cleanInspection: WorldInspectionDto = {
  snapshotId: `pgw:v1:snapshot:sha256:${"1".repeat(64)}`,
  schemaVersion: "phasegate-world-snapshot/v1",
  extractorVersion: "phasegate-world-extractor/v1",
  corpusRoot: `sha256:${"1".repeat(64)}`,
  summary: { nodeCount: 1, edgeCount: 0, diagnosticCount: 0, hardDiagnosticCount: 0 },
  inventory: {
    nodeTypes: [{ value: "source-file", count: 1 }],
    corpusRoles: [],
    artifactKinds: [],
  },
  nodes: [
    {
      id: "pgw:v1:source-file:scripts/harness/main.ts",
      nodeType: "source-file",
      contentDigest: `sha256:${"2".repeat(64)}`,
      projection: { type: "source-file", pathKey: "scripts/harness/main.ts" },
      attributes: {},
    },
  ],
  edges: [],
  diagnostics: [],
};

describe("WorldInspectCommandHandler", () => {
  it("default human形式でprimary resultをstdoutへ返すこと", async () => {
    // Arrange
    const sut = new WorldInspectCommandHandler({ inspectWorld: { execute: async () => cleanInspection } });

    // Act
    const actual = await sut.execute([]);

    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.stderr).toBe("");
    expect(actual.stdout).toContain("World Snapshot");
    expect(actual.stdout).toContain(cleanInspection.corpusRoot);
  });

  it("--jsonと--format jsonが同じ単一envelopeを返すこと", async () => {
    // Arrange
    const sut = new WorldInspectCommandHandler({ inspectWorld: { execute: async () => cleanInspection } });

    // Act
    const actual = [await sut.execute(["--json"]), await sut.execute(["--format", "json"])];

    // Assert
    expect(actual[0]).toEqual(actual[1]);
    expect(JSON.parse(actual[0].stdout)).toEqual({
      schemaVersion: "phasegate-world-cli/v1",
      command: "world:inspect",
      ok: true,
      exitCode: 0,
      data: cleanInspection,
      diagnostics: [],
    });
    expect(actual[0].stdout).not.toContain("generatedAt");
  });

  it("hard diagnosticを含むtrustworthy resultをexit 1で保持すること", async () => {
    // Arrange
    const inspection: WorldInspectionDto = {
      ...cleanInspection,
      summary: { ...cleanInspection.summary, diagnosticCount: 1, hardDiagnosticCount: 1 },
      diagnostics: [{ code: "duplicate-node-id", line: null, nodeId: null, pathKey: "docs/product/a.md", payload: {} }],
    };
    const sut = new WorldInspectCommandHandler({ inspectWorld: { execute: async () => inspection } });

    // Act
    const actual = await sut.execute(["--json"]);

    // Assert
    expect(actual.exitCode).toBe(1);
    expect(JSON.parse(actual.stdout).data).toEqual(inspection);
    expect(actual.stderr).toBe("");
  });

  it("矛盾flagをexit 2にしてuse caseを実行しないこと", async () => {
    // Arrange
    let executions = 0;
    const sut = new WorldInspectCommandHandler({
      inspectWorld: {
        execute: async () => {
          executions += 1;
          return cleanInspection;
        },
      },
    });

    // Act
    const actual = await sut.execute(["--json", "--format", "human"]);

    // Assert
    expect(actual.exitCode).toBe(2);
    expect(actual.stdout).toBe("");
    expect(actual.stderr).toContain("conflicting output format");
    expect(executions).toBe(0);
  });

  it("execution failureをhumanはstderr、JSONはstdout envelopeへ返すこと", async () => {
    // Arrange
    const sut = new WorldInspectCommandHandler({
      inspectWorld: {
        execute: async () => {
          throw new Error("invalid resolved config");
        },
      },
    });

    // Act
    const actual = [await sut.execute([]), await sut.execute(["--json"])];

    // Assert
    expect(actual[0]).toEqual({
      exitCode: 2,
      stdout: "",
      stderr: "world:inspect failed: invalid resolved config\n",
    });
    expect(JSON.parse(actual[1].stdout)).toMatchObject({
      schemaVersion: "phasegate-world-cli/v1",
      command: "world:inspect",
      ok: false,
      exitCode: 2,
      data: null,
    });
    expect(actual[1].stderr).toBe("");
  });
});
