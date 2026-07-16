// @unit harness-api
// @layer e2e-test
// @work-item-id WI-296
// @story H17-10
// @ac H17-10-1
// @ac H17-10-2
// @ac H17-10-3
// @ac H17-10-4
// @ac H17-10-5

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { withTempDir } from "./cli-test-helpers.js";

const MAIN = resolve(dirname(fileURLToPath(import.meta.url)), "../../main.ts");
const TSX_LOADER = createRequire(import.meta.url).resolve("tsx");
const STALE_DIGEST = `sha256:${"a".repeat(64)}`;
const CONSTRAINT_ID = "pgw:v1:constraint:world.cli-source";
const SOURCE_ID = "pgw:v1:source-file:scripts/harness/sample/domain/model.ts";

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

const preparePinnedSource = (cwd: string): string => {
  prepareEmptyCorpus(cwd);
  const sourcePath = join(cwd, "scripts/harness/sample/domain/model.ts");
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(
    sourcePath,
    ["// @unit sample", "// @layer domain", "// @work-item-id WI-296", "export const value = 1;", ""].join("\n"),
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
};

describe("world control CLI E2E", () => {
  it("world:pinはpreviewでは無変更でapply時だけ対象endpointをatomic更新すること", () => {
    const actual = withTempDir((cwd) => {
      // Arrange
      const constraintPath = preparePinnedSource(cwd);
      const before = readFileSync(constraintPath, "utf-8");

      // Act
      const preview = runInCwd(cwd, "world:pin", "--constraint", CONSTRAINT_ID, "--endpoint", "claimant", "--json");
      const afterPreview = readFileSync(constraintPath, "utf-8");
      const applied = runInCwd(
        cwd,
        "world:pin",
        "--constraint",
        CONSTRAINT_ID,
        "--endpoint",
        "claimant",
        "--apply",
        "--json",
      );
      const afterApply = JSON.parse(readFileSync(constraintPath, "utf-8")) as {
        constraints: readonly {
          claimant: { contentDigest: string };
          premise: { contentDigest: string };
        }[];
      };

      return { before, preview, afterPreview, applied, afterApply, cwd };
    });

    // Assert
    expect(actual.preview.exitCode, JSON.stringify(actual.preview)).toBe(0);
    expect(JSON.parse(actual.preview.stdout)).toMatchObject({
      schemaVersion: "phasegate-world-cli/v1",
      command: "world:pin",
      exitCode: 0,
      data: { status: "preview", candidate: { endpoint: "claimant", beforeDigest: STALE_DIGEST, changed: true } },
    });
    expect(actual.afterPreview).toBe(actual.before);
    expect(actual.applied.exitCode, JSON.stringify(actual.applied)).toBe(0);
    expect(JSON.parse(actual.applied.stdout)).toMatchObject({
      data: { status: "applied", candidate: { endpoint: "claimant", changed: true } },
    });
    expect(actual.afterApply.constraints[0].claimant.contentDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(actual.afterApply.constraints[0].claimant.contentDigest).not.toBe(STALE_DIGEST);
    expect(actual.afterApply.constraints[0].premise.contentDigest).toBe(STALE_DIGEST);
    expect(existsSync(join(actual.cwd, ".harness/world-obligations.json"))).toBe(false);
    expect(existsSync(join(actual.cwd, "phasegate.world-baseline.json"))).toBe(false);
    expect(existsSync(join(actual.cwd, "phasegate.world-waivers.json"))).toBe(false);
    expect(existsSync(join(actual.cwd, "phasegate.world-debts.json"))).toBe(false);
  });

  it("world:pinはmissing endpointとmalformed declarationで書き込まずexitを分類すること", () => {
    const actual = withTempDir((cwd) => {
      // Arrange
      const constraintPath = preparePinnedSource(cwd);
      const document = JSON.parse(readFileSync(constraintPath, "utf-8")) as {
        constraints: { claimant: { nodeId: string } }[];
        schemaVersion: string;
      };
      document.constraints[0].claimant.nodeId = "pgw:v1:source-file:scripts/harness/missing.ts";
      writeFileSync(constraintPath, `${JSON.stringify(document, null, 2)}\n`, "utf-8");
      const beforeMissing = readFileSync(constraintPath, "utf-8");

      // Act
      const missing = runInCwd(
        cwd,
        "world:pin",
        "--constraint",
        CONSTRAINT_ID,
        "--endpoint",
        "claimant",
        "--apply",
        "--json",
      );
      const afterMissing = readFileSync(constraintPath, "utf-8");
      document.schemaVersion = "phasegate-world-constraints/v999";
      writeFileSync(constraintPath, `${JSON.stringify(document, null, 2)}\n`, "utf-8");
      const beforeMalformed = readFileSync(constraintPath, "utf-8");
      const malformed = runInCwd(
        cwd,
        "world:pin",
        "--constraint",
        CONSTRAINT_ID,
        "--endpoint",
        "claimant",
        "--apply",
        "--json",
      );
      const afterMalformed = readFileSync(constraintPath, "utf-8");

      return { missing, malformed, beforeMissing, afterMissing, beforeMalformed, afterMalformed };
    });

    // Assert
    expect(actual.missing.exitCode).toBe(1);
    expect(JSON.parse(actual.missing.stdout)).toMatchObject({
      exitCode: 1,
      data: { status: "domain-failure", code: "missing-endpoint" },
    });
    expect(actual.afterMissing).toBe(actual.beforeMissing);
    expect(actual.malformed.exitCode).toBe(2);
    expect(JSON.parse(actual.malformed.stdout)).toMatchObject({
      exitCode: 2,
      data: { status: "execution-failure" },
    });
    expect(actual.afterMalformed).toBe(actual.beforeMalformed);
  });

  it("world:deriveはpure実行を決定的に保ちwrite時だけ既定先へ保存すること", () => {
    const actual = withTempDir((cwd) => {
      // Arrange
      prepareEmptyCorpus(cwd);
      const reportPath = join(cwd, ".harness/world-obligations.json");

      // Act
      const first = runInCwd(cwd, "world:derive", "--json");
      const second = runInCwd(cwd, "world:derive", "--json");
      const existedAfterPure = existsSync(reportPath);
      const written = runInCwd(cwd, "world:derive", "--write", "--json");
      const report = JSON.parse(readFileSync(reportPath, "utf-8")) as { schemaVersion: string };

      return { first, second, existedAfterPure, written, report };
    });

    // Assert
    expect(actual.first.exitCode, JSON.stringify(actual.first)).toBe(0);
    expect(actual.first.stdout).toBe(actual.second.stdout);
    expect(actual.first.stdout).not.toContain("generatedAt");
    expect(actual.existedAfterPure).toBe(false);
    expect(actual.written.exitCode, JSON.stringify(actual.written)).toBe(0);
    expect(JSON.parse(actual.written.stdout)).toMatchObject({
      schemaVersion: "phasegate-world-cli/v1",
      command: "world:derive",
      exitCode: 0,
      data: {
        persistence: { state: "written" },
        writtenPath: ".harness/world-obligations.json",
      },
    });
    expect(actual.report.schemaVersion).toBe("phasegate-world-obligation-report/v1");
  });

  it("world:deriveはcustom出力とCLI/config failureをexit 0/2へ分類すること", () => {
    const actual = withTempDir((cwd) => {
      // Arrange
      prepareEmptyCorpus(cwd);

      // Act
      const outWithoutWrite = runInCwd(cwd, "world:derive", "--out", "reports/world.json", "--json");
      const conflictingFormat = runInCwd(cwd, "world:derive", "--json", "--format", "human");
      const custom = runInCwd(cwd, "world:derive", "--write", "--out", "reports/world.json", "--json");
      writeFileSync(join(cwd, "phasegate.config.json"), "{ invalid", "utf-8");
      const invalidConfig = runInCwd(cwd, "world:derive", "--json");

      return {
        outWithoutWrite,
        conflictingFormat,
        custom,
        customExists: existsSync(join(cwd, "reports/world.json")),
        invalidConfig,
      };
    });

    // Assert
    expect(actual.outWithoutWrite.exitCode).toBe(2);
    expect(actual.conflictingFormat.exitCode).toBe(2);
    expect(actual.custom.exitCode, JSON.stringify(actual.custom)).toBe(0);
    expect(actual.customExists).toBe(true);
    expect(actual.invalidConfig.exitCode).toBe(2);
    expect(JSON.parse(actual.invalidConfig.stdout)).toMatchObject({
      schemaVersion: "phasegate-world-cli/v1",
      command: "world:derive",
      exitCode: 2,
      data: null,
    });
  });

  it("helpはpinのapplyとderiveのwriteを別のmutation flagとして表示すること", () => {
    // Arrange / Act
    const pin = runInCwd(process.cwd(), "world:pin", "--help");
    const derive = runInCwd(process.cwd(), "world:derive", "--help");

    // Assert
    expect(pin.exitCode).toBe(0);
    expect(pin.stdout).toContain("--apply");
    expect(pin.stdout).not.toContain("--write");
    expect(derive.exitCode).toBe(0);
    expect(derive.stdout).toContain("--write");
    expect(derive.stdout).toContain("--out");
    expect(derive.stdout).not.toContain("--apply");
  });
});
