// @unit regression-suite
// @layer e2e-test
// @work-item-id WI-307
// @story H17-19
// @ac H17-19-4

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KNOWN_HARNESS_COMMANDS } from "../../harness-api/domain/value-objects/known-harness-commands.js";
import { withTempDir } from "./cli-test-helpers.js";

const CONSTRAINT_ID = "pgw:v1:constraint:world.production-contract";
const SOURCE_ID = "pgw:v1:source-file:scripts/harness/sample/domain/model.ts";
const STALE_DIGEST = `sha256:${"a".repeat(64)}`;
const MAIN = join(dirname(fileURLToPath(import.meta.url)), "../../main.ts");
const TSX_LOADER = createRequire(import.meta.url).resolve("tsx");

function runInCwd(cwd: string, ...args: string[]) {
  const result = spawnSync(process.execPath, ["--import", TSX_LOADER, MAIN, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 90_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    exitCode: result.status ?? 2,
  };
}

function prepareEmptyCorpus(cwd: string): void {
  for (const directory of [
    "docs/product/units",
    "docs/product/construction",
    "docs/inception",
    "docs/ADR",
    "scripts/harness/__tests__",
  ]) {
    mkdirSync(join(cwd, directory), { recursive: true });
  }
  writeFileSync(join(cwd, "docs/product/user_stories.md"), "", "utf-8");
}

function preparePinnedSource(cwd: string): string {
  prepareEmptyCorpus(cwd);
  const sourcePath = join(cwd, "scripts/harness/sample/domain/model.ts");
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(
    sourcePath,
    ["// @unit sample", "// @layer domain", "// @work-item-id WI-307", "export const value = 1;", ""].join("\n"),
    "utf-8",
  );
  const constraintPath = join(cwd, "phasegate.world-constraints.json");
  writeFileSync(
    constraintPath,
    `${JSON.stringify(
      {
        schemaVersion: "phasegate-world-constraints/v1",
        constraints: [
          {
            constraintId: CONSTRAINT_ID,
            factType: "content-equals",
            claimant: { nodeId: SOURCE_ID, contentDigest: STALE_DIGEST },
            premise: { nodeId: SOURCE_ID, contentDigest: STALE_DIGEST },
            applicableRuleIds: ["WCR-008"],
          },
        ],
        aliases: [],
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  return constraintPath;
}

describe("World CLI production regression contract", () => {
  it("canonical command catalogが3つのworld commandを公開すること", () => {
    // Arrange
    const expected = ["world:derive", "world:inspect", "world:pin"];

    // Act
    const actual = KNOWN_HARNESS_COMMANDS.filter((command) => command.startsWith("world:"));

    // Assert
    expect(actual).toEqual(expected);
  });

  it("3つのworld commandがv1 JSON envelopeと契約どおりのexitを返すこと", () => {
    const actual = withTempDir((cwd) => {
      // Arrange
      preparePinnedSource(cwd);

      // Act
      return [
        runInCwd(cwd, "world:inspect", "--json"),
        runInCwd(cwd, "world:pin", "--constraint", CONSTRAINT_ID, "--endpoint", "claimant", "--json"),
        runInCwd(cwd, "world:derive", "--json"),
      ];
    });

    // Assert
    expect(actual.map((result) => result.exitCode)).toEqual([0, 0, 1]);
    expect(actual.map((result) => JSON.parse(result.stdout))).toEqual([
      expect.objectContaining({ schemaVersion: "phasegate-world-cli/v1", command: "world:inspect", exitCode: 0 }),
      expect.objectContaining({ schemaVersion: "phasegate-world-cli/v1", command: "world:pin", exitCode: 0 }),
      expect.objectContaining({ schemaVersion: "phasegate-world-cli/v1", command: "world:derive", exitCode: 1 }),
    ]);
  }, 60_000);

  it("domain findingはexit 1でcontrol fileを書き換えないこと", () => {
    const actual = withTempDir((cwd) => {
      // Arrange
      const constraintPath = preparePinnedSource(cwd);
      const document = JSON.parse(readFileSync(constraintPath, "utf-8")) as {
        constraints: { claimant: { nodeId: string } }[];
      };
      document.constraints[0].claimant.nodeId = "pgw:v1:source-file:scripts/harness/missing.ts";
      writeFileSync(constraintPath, `${JSON.stringify(document, null, 2)}\n`, "utf-8");
      const before = readFileSync(constraintPath, "utf-8");

      // Act
      const result = runInCwd(
        cwd,
        "world:pin",
        "--constraint",
        CONSTRAINT_ID,
        "--endpoint",
        "claimant",
        "--apply",
        "--json",
      );
      return { result, before, after: readFileSync(constraintPath, "utf-8") };
    });

    // Assert
    expect(actual.result.exitCode).toBe(1);
    expect(JSON.parse(actual.result.stdout)).toMatchObject({
      schemaVersion: "phasegate-world-cli/v1",
      command: "world:pin",
      exitCode: 1,
    });
    expect(actual.after).toBe(actual.before);
  }, 60_000);

  it("trustworthy resultを作れないconfigではexit 2を返しreportを書かないこと", () => {
    const actual = withTempDir((cwd) => {
      // Arrange
      prepareEmptyCorpus(cwd);
      writeFileSync(join(cwd, "phasegate.config.json"), "{ invalid", "utf-8");

      // Act
      const result = runInCwd(cwd, "world:derive", "--json");
      return { result, reportExists: existsSync(join(cwd, ".harness/world-obligations.json")) };
    });

    // Assert
    expect(actual.result.exitCode).toBe(2);
    expect(JSON.parse(actual.result.stdout)).toMatchObject({
      schemaVersion: "phasegate-world-cli/v1",
      command: "world:derive",
      exitCode: 2,
    });
    expect(actual.reportExists).toBe(false);
  }, 60_000);
});
