// @unit harness-api
// @layer e2e-test
// @work-item-id WI-291
// @story H17-06

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { withTempDir } from "./cli-test-helpers.js";

const MAIN = resolve(dirname(fileURLToPath(import.meta.url)), "../../main.ts");
const TSX_LOADER = createRequire(import.meta.url).resolve("tsx");

const runInCwd = (cwd: string, ...args: string[]) => {
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
};

const run = (...args: string[]) => runInCwd(resolve(dirname(fileURLToPath(import.meta.url)), "../../../.."), ...args);

const prepareEmptyCorpus = (cwd: string): void => {
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
};

describe("world:inspect CLI E2E", () => {
  it("root helpとsubcommand helpにread-only inspect contractを表示すること", () => {
    // Arrange / Act
    const actual = [run("--help"), run("world:inspect", "--help")];

    // Assert
    expect(actual[0].stdout).toContain("world:inspect");
    expect(actual[1].exitCode).toBe(0);
    expect(actual[1].stdout).toContain("Usage: phasegate world:inspect");
    expect(actual[1].stdout).toContain("--format <human|json>");
    expect(actual[1].stdout).toContain("read-only");
  });

  it("configなしの空corpusをhumanとJSONでread-only inspectionすること", () => {
    const actual = withTempDir((cwd) => {
      // Arrange
      prepareEmptyCorpus(cwd);
      const before = readdirSync(cwd, { recursive: true }).map(String).sort();

      // Act
      const human = runInCwd(cwd, "world:inspect");
      const json = runInCwd(cwd, "world:inspect", "--json");
      const after = readdirSync(cwd, { recursive: true }).map(String).sort();

      // Assert
      expect(human.exitCode, JSON.stringify(human)).toBe(0);
      expect(human.stdout).toContain("World Snapshot");
      expect(human.stderr).toBe("");
      expect(json.exitCode).toBe(0);
      expect(json.stderr).toBe("");
      expect(JSON.parse(json.stdout)).toMatchObject({
        schemaVersion: "phasegate-world-cli/v1",
        command: "world:inspect",
        ok: true,
        exitCode: 0,
      });
      expect(after).toEqual(before);
      return json.stdout;
    });

    expect(actual).not.toContain("generatedAt");
  });

  it("同一corpusのJSON出力が2回でbyte-identicalになること", () => {
    const actual = withTempDir((cwd) => {
      // Arrange
      prepareEmptyCorpus(cwd);

      // Act
      return [runInCwd(cwd, "world:inspect", "--json"), runInCwd(cwd, "world:inspect", "--json")];
    });

    // Assert
    expect(actual[0].exitCode, JSON.stringify(actual[0])).toBe(0);
    expect(actual[0].stdout).toBe(actual[1].stdout);
  });

  it("不正なconfigが存在する場合はdefaultsへfallbackせずexit 2にすること", () => {
    const actual = withTempDir((cwd) => {
      // Arrange
      prepareEmptyCorpus(cwd);
      writeFileSync(join(cwd, "phasegate.config.json"), "{ invalid", "utf-8");

      // Act
      const result = runInCwd(cwd, "world:inspect", "--json");

      // Assert
      expect(readFileSync(join(cwd, "phasegate.config.json"), "utf-8")).toBe("{ invalid");
      return result;
    });

    expect(actual.exitCode, JSON.stringify(actual)).toBe(2);
    expect(JSON.parse(actual.stdout)).toMatchObject({
      schemaVersion: "phasegate-world-cli/v1",
      command: "world:inspect",
      ok: false,
      exitCode: 2,
      data: null,
    });
  });

  it("実repository corpusのcountsとcorpusRootをJSON表示すること", () => {
    // Arrange / Act
    const actual = run("world:inspect", "--json");

    // Assert
    expect([0, 1]).toContain(actual.exitCode);
    expect(actual.stderr).toBe("");
    const document = JSON.parse(actual.stdout) as {
      data: {
        corpusRoot: string;
        summary: { nodeCount: number; edgeCount: number; diagnosticCount: number };
      };
    };
    expect(document.data.corpusRoot).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(document.data.summary.nodeCount).toBeGreaterThan(1_000);
    expect(document.data.summary.edgeCount).toBeGreaterThan(0);
    expect(document.data.summary.diagnosticCount).toBeGreaterThan(0);
  });
});
