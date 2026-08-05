// @layer test
// @unit harness-api
// @story H10-05
// @work-item-id WI-351

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { execPath } from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { context, target } from "../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");
const TSX_IMPORT = createRequire(import.meta.url).resolve("tsx");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(args: readonly string[], cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(execPath, ["--import", TSX_IMPORT, MAIN_TS, ...args], { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
  });
}

/** プロジェクトルートに config と既存ファイルを持ち、サブディレクトリを備えた一時プロジェクトを作る。 */
function createProjectWithSubdirectory(): { projectRoot: string; subDirectory: string } {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "phasegate-wi351-"));
  mkdirSync(path.join(projectRoot, "misc"), { recursive: true });
  const subDirectory = path.join(projectRoot, "sub");
  mkdirSync(subDirectory, { recursive: true });
  writeFileSync(path.join(projectRoot, "misc", "existing.ts"), "export const x = 1;\n", "utf8");
  writeFileSync(
    path.join(projectRoot, "phasegate.config.json"),
    `${JSON.stringify(
      {
        project: { name: "wi351", preset: "standard" },
        architecture: { preset: "clean" },
        layers: {},
        quickMode: {
          allowedCategories: ["bugfix", "docs", "test", "config"],
          maintainedLayers: ["L1"],
          relaxedGates: [],
        },
        phaseDependencies: { preset: "default", override: false, customRules: [] },
        planningMode: { default: "interactive", perPhase: {} },
        harnesses: {},
        baseline: { enabled: false },
        paths: {
          designDocs: "docs/product/construction",
          inceptionDocs: "docs/inception",
        },
        reporting: { format: "json", outputDir: "reports" },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return { projectRoot, subDirectory };
}

target("phasegate check-change-category の rootDir 整合", () => {
  context("サブディレクトリから CLI を実行した場合", () => {
    it("プロジェクトルート基準で config と既存ファイルが解決され bugfix と分類されること", async () => {
      // Arrange
      const { subDirectory } = createProjectWithSubdirectory();

      // Act
      const result = await runCli(
        ["check-change-category", "--paths", "misc/existing.ts", "--format", "json"],
        subDirectory,
      );
      const actual = JSON.parse(result.stdout) as {
        dominantCategory: string | null;
        fullModeRequired: boolean;
      };

      // Assert
      expect(result.exitCode).toBe(0);
      expect(actual.dominantCategory).toBe("bugfix");
      expect(actual.fullModeRequired).toBe(false);
    }, 30_000);
  });
});
