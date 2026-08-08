// @unit harness-api
// @layer integration
// @story H13-04
// @work-item-id WI-385
// @work-item-id WI-320

// WI-320 (github#39): WI-319 のファイルシステム言語検出が実 CLI 経路で dead code に
// なっていた regression の再現テスト。config-foundation の resolution / mapper が
// 「languages 未宣言」を ["typescript"] に潰すと、adapter の検出分岐に到達しないまま
// 純 Python リポジトリで L3-003 が FAIL する。実 CLI（validate --layer L3）を spawn して
// 未宣言→検出 SKIP、宣言→従来実行の両方を固定する。

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { context, target } from "../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", path.join(HARNESS_ROOT, "node_modules/tsx/dist/loader.mjs"), MAIN_TS, ...args],
      { cwd, env },
    );
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
    child.stdin.end();
  });
}

const BASE_CONFIG = {
  project: { name: "pure-python-project", preset: "standard" },
  architecture: { preset: "clean" },
  layers: {},
  quickMode: {},
  phaseDependencies: { preset: "standard", override: false, customRules: [] },
  planningMode: { default: "interactive", perPhase: {} },
  harnesses: {},
  paths: { designDocs: "docs/product/construction", inceptionDocs: "docs/inception" },
  reporting: { format: "json", outputDir: "reports" },
};

/**
 * 純 Python リポジトリの fixture:
 * - pyproject.toml のみ（python マーカー）
 * - phasegate 導入で置かれる package.json（typescript 依存なし → typescript 根拠にならない）
 */
async function setupPurePythonRepo(workDir: string, config: object): Promise<void> {
  await writeFile(path.join(workDir, "pyproject.toml"), '[project]\nname = "sample"\nversion = "0.1.0"\n', "utf-8");
  await writeFile(
    path.join(workDir, "package.json"),
    JSON.stringify({ name: "sample", private: true, devDependencies: { phasegate: "*" } }, null, 2),
    "utf-8",
  );
  await writeFile(path.join(workDir, "phasegate.config.json"), JSON.stringify(config, null, 2), "utf-8");
}

target("phasegate validate --layer L3 language detection (WI-320 / github#39)", () => {
  context("純 Python リポジトリで project.languages が未宣言の場合", () => {
    it("実 CLI 経路で L3-003 が unsupported-language SKIP になり FAIL しないこと", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-lang-detect-"));
      try {
        await setupPurePythonRepo(workDir, BASE_CONFIG);

        // Act
        const actual = await runCli(["validate", "--layer", "L3", "--format", "human"], workDir);

        // Assert — 検出された python が L3-003 (TS 専用) を SKIP させること
        expect(actual.stdout).toContain("[SKIP] L3-003");
        expect(actual.stdout).toContain("unsupported-language");
        expect(actual.stdout).not.toContain("[FAIL] L3-003");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("同じ純 Python リポジトリでも project.languages を明示宣言している場合（宣言優先の回帰防止）", () => {
    it('languages: ["typescript"] の宣言があると L3-003 は SKIP されず従来どおり実行されること', async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-lang-declared-"));
      try {
        await setupPurePythonRepo(workDir, {
          ...BASE_CONFIG,
          project: { ...BASE_CONFIG.project, languages: ["typescript"] },
        });

        // Act
        const actual = await runCli(["validate", "--layer", "L3", "--format", "human"], workDir);

        // Assert — 宣言が最優先: L3-003 は実行される（PASS / FAIL / WARN いずれでもよいが SKIP でない）
        expect(actual.stdout).not.toContain("[SKIP] L3-003");
        const l3003Executed = /\[(PASS|FAIL|WARN)\] L3-003/.test(actual.stdout);
        expect(l3003Executed).toBe(true);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });
});
