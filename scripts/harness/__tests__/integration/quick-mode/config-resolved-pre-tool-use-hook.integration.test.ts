// @layer test
// @unit quick-mode
// @work-item-id WI-346

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { execPath } from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");
const TSX_IMPORT = createRequire(import.meta.url).resolve("tsx");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runHook(stdin: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(execPath, ["--import", TSX_IMPORT, MAIN_TS, "hook", "pre-tool-use"], {
      cwd: HARNESS_ROOT,
      env: process.env,
    });
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
    child.stdin.write(stdin);
    child.stdin.end();
  });
}

function createPersonalConfigProject(): string {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "phasegate-wi346-hook-"));
  const personalConfigDir = path.join(projectRoot, ".phasegate-local");
  const targetDir = path.join(projectRoot, "misc");
  mkdirSync(personalConfigDir, { recursive: true });
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(
    path.join(personalConfigDir, "phasegate.config.json"),
    `${JSON.stringify(
      {
        project: { name: "wi346-hook", preset: "standard" },
        architecture: { preset: "clean" },
        layers: {},
        quickMode: {
          allowedCategories: ["docs"],
          maintainedLayers: ["L1"],
          relaxedGates: [],
        },
        phaseDependencies: { preset: "default", override: false, customRules: [] },
        planningMode: { default: "interactive", perPhase: {} },
        harnesses: {},
        baseline: { enabled: false },
        paths: {
          designDocs: ".phasegate-local/docs/product/construction",
          inceptionDocs: ".phasegate-local/docs/inception",
        },
        reporting: { format: "json", outputDir: "reports" },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(path.join(targetDir, "existing.ts"), "export const before = true;\n", "utf8");
  return projectRoot;
}

target("pre-tool-use hook の quick-mode config 解決 (WI-346)", () => {
  describe("hook の cwd にある personal config を quick-mode 分類へ引き渡す", () => {
    it("実行プロセスと異なる cwd の personal config で bugfix が許可されていない場合はブロックすること", async () => {
      // Arrange
      const projectRoot = createPersonalConfigProject();
      const targetPath = path.join(projectRoot, "misc/existing.ts");
      const stdin = JSON.stringify({
        cwd: projectRoot,
        tool_name: "Write",
        tool_input: {
          file_path: targetPath,
          content: "export const after = true;\n",
        },
      });

      // Act
      const actual = await runHook(stdin);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain("Full mode 必須変更が検出されました");
      expect(actual.stderr).toContain("カテゴリ: bugfix");
      expect(actual.stderr).not.toContain("write allowed (Quick Mode");
    }, 60000);
  });
});
