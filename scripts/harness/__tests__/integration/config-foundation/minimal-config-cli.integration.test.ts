// @layer test
// @unit config-foundation
// @story H04-01
// @work-item-id WI-385
// @work-item-id WI-327

// WI-327: 手書きの最小 config（project のみ）で実 CLI（validate --layer L2）が
// L1-001 の top-level required エラーを出さずに動作することを spawn レベルで固定する。
// ユニットが green でも実 CLI 配線が切れている事故（WI-320 の教訓）を防ぐため、
// temp dir に最小 config だけを置いて main.ts を実プロセスとして起動する。

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

function runCli(args: string[], cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", path.join(HARNESS_ROOT, "node_modules/tsx/dist/loader.mjs"), MAIN_TS, ...args],
      { cwd, env: process.env },
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

async function setupRepo(workDir: string, config: object): Promise<void> {
  await writeFile(
    path.join(workDir, "package.json"),
    JSON.stringify({ name: "myapp", private: true, devDependencies: { phasegate: "*" } }, null, 2),
    "utf-8",
  );
  await writeFile(path.join(workDir, "phasegate.config.json"), JSON.stringify(config, null, 2), "utf-8");
}

target("phasegate validate と最小 config (WI-327)", () => {
  context("temp リポジトリに project のみの最小 config だけを置いた場合", () => {
    it("WI-327: 実 CLI の validate --layer L2 が L1-001 required エラーなしで実行されること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-minimal-config-"));
      try {
        await setupRepo(workDir, { project: { name: "myapp", preset: "standard" } });

        // Act
        const actual = await runCli(["validate", "--layer", "L2", "--format", "human"], workDir);

        // Assert — config エラー（exit 2）にならず、L1-001 required が出ずに検査が実行される
        expect(actual.exitCode).not.toBe(2);
        expect(`${actual.stdout}${actual.stderr}`).not.toContain("L1-001");
        expect(actual.stdout).toContain("=== バリデーション結果 ===");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("最小 config に型不正な reporting を書き足した場合（緩和が検証を弱めていないことの CLI 証跡）", () => {
    it("WI-327: 実 CLI は書かれた不正キーを従来どおり exit 2 の L1-001 で拒否すること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-minimal-config-invalid-"));
      try {
        await setupRepo(workDir, {
          project: { name: "myapp", preset: "standard" },
          reporting: { format: 123 },
        });

        // Act
        const actual = await runCli(["validate", "--layer", "L2", "--format", "human"], workDir);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(`${actual.stdout}${actual.stderr}`).toContain("L1-001");
        expect(`${actual.stdout}${actual.stderr}`).toContain("/reporting/format");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });
});
