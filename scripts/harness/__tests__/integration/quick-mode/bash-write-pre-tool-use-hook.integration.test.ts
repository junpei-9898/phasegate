// @layer test
// @unit quick-mode
// @work-item-id WI-345

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

function runHook(stdin: string, cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(execPath, ["--import", TSX_IMPORT, MAIN_TS, "hook", "pre-tool-use"], {
      cwd,
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

function createProjectRoot(): string {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "phasegate-wi345-hook-"));
  writeFileSync(
    path.join(projectRoot, "phasegate.config.json"),
    `${JSON.stringify(
      {
        project: { name: "wi345-hook", preset: "standard" },
        architecture: { preset: "clean" },
        layers: {},
        quickMode: {
          allowedCategories: ["bugfix", "docs", "test", "config"],
          relaxedGates: ["phase-gate", "2-phase-execution"],
        },
        phaseDependencies: { preset: "default", override: false, customRules: [] },
        planningMode: { default: "interactive", perPhase: {} },
        harnesses: {},
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
  return projectRoot;
}

target("pre-tool-use hook × Bash 書き込み分類 (WI-345)", () => {
  describe("Bash 抽出ターゲットをファイル存在状態に応じて分類する", () => {
    it("Bash 経由で存在しないソースファイルを作成する場合は feature と判定してブロックすること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const targetPath = "scripts/harness/quick-mode/application/bash-created-target.ts";
      const stdin = JSON.stringify({
        cwd: projectRoot,
        tool_name: "Bash",
        tool_input: {
          command: `cat > ${targetPath}`,
        },
      });

      // Act
      const actual = await runHook(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain("Full mode 必須変更が検出されました");
      expect(actual.stderr).toContain("カテゴリ: feature");
      expect(actual.stderr).toContain(targetPath);
    }, 60000);

    it("未展開のシェル変数を含むリダイレクト先は bugfix と判定して通過すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const targetPath = "$LOG_DIR/out.log";
      const stdin = JSON.stringify({
        cwd: projectRoot,
        tool_name: "Bash",
        tool_input: {
          command: `npm run test > ${targetPath}`,
        },
      });

      // Act
      const actual = await runHook(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stderr).toContain("write allowed (Quick Mode, category=bugfix)");
      expect(actual.stderr).not.toContain("Full mode 必須変更が検出されました");
    }, 60000);

    it("Bash 経由で存在するソースファイルへ追記する場合は従来どおり bugfix と判定して通過すること", async () => {
      // Arrange
      const projectRoot = createProjectRoot();
      const targetPath = "scripts/harness/quick-mode/application/bash-appended-target.ts";
      const absoluteTargetPath = path.join(projectRoot, targetPath);
      mkdirSync(path.dirname(absoluteTargetPath), { recursive: true });
      writeFileSync(absoluteTargetPath, "export const existing = true;\n", "utf8");
      const stdin = JSON.stringify({
        cwd: projectRoot,
        tool_name: "Bash",
        tool_input: {
          command: `printf '\\n' >> ${targetPath}`,
        },
      });

      // Act
      const actual = await runHook(stdin, projectRoot);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stderr).toContain("write allowed (Quick Mode, category=bugfix)");
      expect(actual.stderr).not.toContain("Full mode 必須変更が検出されました");
    }, 60000);
  });
});
