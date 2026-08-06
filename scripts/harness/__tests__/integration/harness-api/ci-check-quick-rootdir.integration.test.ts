// @layer test
// @unit harness-api
// @story H10-03
// @work-item-id WI-364

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { execPath } from "node:process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
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

/** プロジェクトルートにのみ config を置き、サブディレクトリを備えた一時プロジェクトを作る。 */
function createProjectWithSubdirectory(): { projectRoot: string; subDirectory: string } {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "phasegate-wi364-"));
  mkdirSync(path.join(projectRoot, "docs", "guide"), { recursive: true });
  const subDirectory = path.join(projectRoot, "sub");
  mkdirSync(subDirectory, { recursive: true });
  writeFileSync(path.join(projectRoot, "docs", "guide", "example.md"), "# example\n", "utf8");
  writeFileSync(
    path.join(projectRoot, "phasegate.config.json"),
    `${JSON.stringify(
      {
        project: { name: "wi364", preset: "standard" },
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

target("phasegate ci-check --quick の rootDir 整合", () => {
  context("サブディレクトリから CLI を実行した場合", () => {
    it("プロジェクトルートの config が解決され quickMode 判定が成功すること", async () => {
      // Arrange
      const { subDirectory } = createProjectWithSubdirectory();

      // Act
      const result = await runCli(
        ["ci-check", "--quick", "--dry-run", "--files", "docs/guide/example.md", "--format", "json"],
        subDirectory,
      );
      const actual = JSON.parse(result.stdout) as {
        eligibility: { eligible: boolean };
      };

      // Assert
      expect(result.exitCode).toBe(0);
      expect(actual.eligibility.eligible).toBe(true);
    }, 30_000);
  });

  context("プロジェクトルートから CLI を実行した場合", () => {
    it("従来どおり quickMode 判定が成功すること", async () => {
      // Arrange
      const { projectRoot } = createProjectWithSubdirectory();

      // Act
      const result = await runCli(
        ["ci-check", "--quick", "--dry-run", "--files", "docs/guide/example.md", "--format", "json"],
        projectRoot,
      );
      const actual = JSON.parse(result.stdout) as {
        eligibility: { eligible: boolean };
      };

      // Assert
      expect(result.exitCode).toBe(0);
      expect(actual.eligibility.eligible).toBe(true);
    }, 30_000);
  });
});
