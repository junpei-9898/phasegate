// @layer test
// @unit agent-integration
// @story H11-02
// @work-item-id WI-376

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { execPath } from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

/**
 * ADR-039: hook は呼び出し元 skill 名（hook input の caller_skill / 環境変数
 * PHASEGATE_CALLER_SKILL）を受け取らない。復旧案内は dominantCategory のみから決まる。
 *
 * 受け口が実在した頃はこの経路を検証する手段が「use case に callerSkill を直接注入する」
 * mock テストしか無く、実運用では一度も通らない経路が緑になっていた（偽の被覆）。
 * 本テストは実プロセスの hook に両チャネルを与えても案内が変わらないことを固定する。
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");
const TSX_IMPORT = createRequire(import.meta.url).resolve("tsx");

interface HookResult {
  exitCode: number;
  stderr: string;
}

function runHook(stdin: string, extraEnv: Record<string, string>): Promise<HookResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(execPath, ["--import", TSX_IMPORT, MAIN_TS, "hook", "pre-tool-use"], {
      cwd: HARNESS_ROOT,
      env: { ...process.env, ...extraEnv },
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({ exitCode: code ?? -1, stderr });
    });
    child.stdin.write(stdin);
    child.stdin.end();
  });
}

function createProject(): string {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "phasegate-wi376-hook-"));
  mkdirSync(path.join(projectRoot, "misc"), { recursive: true });
  writeFileSync(
    path.join(projectRoot, "phasegate.config.json"),
    `${JSON.stringify(
      {
        project: { name: "wi376-hook", preset: "standard" },
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
  writeFileSync(path.join(projectRoot, "misc/existing.ts"), "export const before = true;\n", "utf8");
  return projectRoot;
}

target("pre-tool-use hook の skill context 受け口廃止 (WI-376 / ADR-039)", () => {
  describe("caller_skill / PHASEGATE_CALLER_SKILL は案内に影響しない", () => {
    it("両チャネルを与えても quick スコープの遮断は category 由来の quick-mode-relax 案内になること", async () => {
      // Arrange
      const projectRoot = createProject();
      const stdin = JSON.stringify({
        cwd: projectRoot,
        tool_name: "Write",
        caller_skill: "story-implementor",
        tool_input: {
          file_path: path.join(projectRoot, "misc/existing.ts"),
          content: "export const after = true;\n",
        },
      });

      // Act
      const actual = await runHook(stdin, { PHASEGATE_CALLER_SKILL: "story-implementor" });

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain("カテゴリ: bugfix");
      expect(actual.stderr).toContain("Quick Mode の許可カテゴリを確認してください");
      expect(actual.stderr).not.toContain("/story-implementor");
    }, 60000);

    it("未知キー caller_skill を含む payload でも許可判定が変わらないこと", async () => {
      // Arrange
      const projectRoot = createProject();
      const stdin = JSON.stringify({
        cwd: projectRoot,
        tool_name: "Write",
        caller_skill: "quick-implementor",
        tool_input: {
          file_path: path.join(projectRoot, "docs/notes.md"),
          content: "# notes\n",
        },
      });

      // Act
      const actual = await runHook(stdin, { PHASEGATE_CALLER_SKILL: "quick-implementor" });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stderr).toContain("write allowed (Quick Mode, category=docs)");
      expect(actual.stderr).not.toContain("実行エラー");
    }, 60000);
  });
});
