// @unit agent-integration
// @layer integration
// @story H11-02
// @work-item-id WI-385

/**
 * ISSUE-013 Wave 3 / C-5: UserPromptSubmit hook の動作検証。
 *
 * 毎ターン発火するため簡潔な出力にする方針。SessionStart と出力フォーマットが
 * 異なる (運用ルールの再掲を省く) ことを確認する。
 */

import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../../..");
const MAIN_TS = path.join(HARNESS_ROOT, "scripts/harness/main.ts");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], cwd: string, stdin?: string): Promise<CliResult> {
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
    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

target("UserPromptSubmit hook (ISSUE-013 Wave 3 / C-5)", () => {
  describe("Codex 公式スキーマ準拠の出力", () => {
    it('hookSpecificOutput.hookEventName = "UserPromptSubmit" を含む JSON を返す', async () => {
      // Arrange
      const stdin = JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        prompt: "test prompt",
      });

      // Act
      const actual = await runCli(["hook", "user-prompt-submit"], HARNESS_ROOT, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      const parsed = JSON.parse(actual.stdout);
      expect(parsed.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
      expect(typeof parsed.hookSpecificOutput.additionalContext).toBe("string");
    }, 30000);

    it("additionalContext は SessionStart より簡潔 (運用ルールの本文を再掲しない)", async () => {
      // Arrange
      const stdin = JSON.stringify({ hook_event_name: "UserPromptSubmit" });

      // Act
      const actual = await runCli(["hook", "user-prompt-submit"], HARNESS_ROOT, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      const parsed = JSON.parse(actual.stdout);
      const context = parsed.hookSpecificOutput.additionalContext as string;
      expect(context).toContain("refresh");
      expect(context).toContain("Protected files");
      // SessionStart に含まれていたフル運用ルール本文は含まない
      expect(context).not.toContain("Do NOT write to protected files without going through");
    }, 30000);
  });

  describe("phase-gate で新たにブロックされた Unit を動的に検知", () => {
    it("setup 中に追加された設計文書欠けの Unit を反映する", async () => {
      // Arrange: 新しい blocked unit を prompt 間で作る状況を想定
      const projectRoot = await mkdtemp(path.join(tmpdir(), "user-prompt-submit-dyn-"));
      const unitDir = path.join(projectRoot, "docs", "product", "construction", "dynamic-blocked");
      await mkdir(unitDir, { recursive: true });
      // どちらの設計文書も欠落
      await writeFile(path.join(unitDir, "placeholder.txt"), "", "utf8");

      const stdin = JSON.stringify({ hook_event_name: "UserPromptSubmit" });

      try {
        // Act
        const actual = await runCli(["hook", "user-prompt-submit"], projectRoot, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.stdout);
        const context = parsed.hookSpecificOutput.additionalContext as string;
        expect(context).toContain("dynamic-blocked");
        expect(context).toContain("story-implementor");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    }, 30000);
  });

  describe("エラー耐性", () => {
    it("stdin が空でも exit 0 で JSON を返す", async () => {
      // Arrange
      const stdin = "";

      // Act
      const actual = await runCli(["hook", "user-prompt-submit"], HARNESS_ROOT, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(() => JSON.parse(actual.stdout)).not.toThrow();
    }, 30000);
  });

  describe("違反検知 (ISSUE-013 Wave 3 / C-6 軽量版)", () => {
    it("working tree の保護ファイル変更を violation として列挙する", async () => {
      // Arrange: git リポジトリを作って biome.json を変更した状態を再現
      const projectRoot = await mkdtemp(path.join(tmpdir(), "user-prompt-violation-"));
      // 最小限の git リポジトリ + protected file
      const { spawn: s } = await import("node:child_process");
      const run = (cmd: string, args: string[]) =>
        new Promise<void>((resolve, reject) => {
          const c = s(cmd, args, { cwd: projectRoot });
          c.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exit ${code}`))));
          c.on("error", reject);
        });
      await run("git", ["init", "-q"]);
      await run("git", ["config", "user.email", "test@example.com"]);
      await run("git", ["config", "user.name", "Test"]);
      await writeFile(path.join(projectRoot, "biome.json"), "{}", "utf8");
      await writeFile(path.join(projectRoot, "README.md"), "# test", "utf8");
      await run("git", ["add", "."]);
      await run("git", ["commit", "-q", "-m", "init"]);
      // 保護ファイルを working tree で改変
      await writeFile(path.join(projectRoot, "biome.json"), '{"changed":true}', "utf8");

      const stdin = JSON.stringify({ hook_event_name: "UserPromptSubmit" });

      try {
        // Act
        const actual = await runCli(["hook", "user-prompt-submit"], projectRoot, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.stdout);
        const context = parsed.hookSpecificOutput.additionalContext as string;
        expect(context).toContain("violations detected");
        expect(context).toContain("PROTECTED FILE");
        expect(context).toContain("biome.json");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    }, 30000);

    it("blocked unit 配下のファイル変更を phase-gate violation として列挙する", async () => {
      // Arrange: blocked unit (logical_design.md 欠落) 配下の source に変更がある状態
      const projectRoot = await mkdtemp(path.join(tmpdir(), "user-prompt-phase-gate-"));
      const { spawn: s } = await import("node:child_process");
      const run = (cmd: string, args: string[]) =>
        new Promise<void>((resolve, reject) => {
          const c = s(cmd, args, { cwd: projectRoot });
          c.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exit ${code}`))));
          c.on("error", reject);
        });
      await run("git", ["init", "-q"]);
      await run("git", ["config", "user.email", "test@example.com"]);
      await run("git", ["config", "user.name", "Test"]);

      // blocked unit: docs だけあるが logical_design.md / domain_model.md 無し
      const unitConstructionDir = path.join(projectRoot, "docs", "product", "construction", "my-blocked-unit");
      await mkdir(unitConstructionDir, { recursive: true });
      await writeFile(path.join(unitConstructionDir, "placeholder.txt"), "", "utf8");

      // 実装コード配置 (blocked unit の name が path に出る)
      const srcDir = path.join(projectRoot, "src", "my-blocked-unit");
      await mkdir(srcDir, { recursive: true });
      await writeFile(path.join(srcDir, "impl.ts"), "// v1", "utf8");

      await run("git", ["add", "."]);
      await run("git", ["commit", "-q", "-m", "init"]);

      // 違反: blocked unit の source を編集
      await writeFile(path.join(srcDir, "impl.ts"), "// v2 (violated)", "utf8");

      const stdin = JSON.stringify({ hook_event_name: "UserPromptSubmit" });

      try {
        // Act
        const actual = await runCli(["hook", "user-prompt-submit"], projectRoot, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.stdout);
        const context = parsed.hookSpecificOutput.additionalContext as string;
        expect(context).toContain("PHASE-GATE");
        expect(context).toContain("my-blocked-unit");
        expect(context).toContain("impl.ts");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    }, 30000);

    it("変更が無ければ violation セクションを出力しない", async () => {
      // Arrange: HARNESS_ROOT は git 下だが、このテスト時点で biome.json 等は未変更
      const stdin = JSON.stringify({ hook_event_name: "UserPromptSubmit" });

      // Act
      const actual = await runCli(["hook", "user-prompt-submit"], HARNESS_ROOT, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      const parsed = JSON.parse(actual.stdout);
      const context = parsed.hookSpecificOutput.additionalContext as string;
      // 現在の working tree に biome.json / package-lock.json 等の変更が無い限り
      // "violations detected" は出ないはず
      if (!context.includes("biome.json") || !context.includes("PROTECTED FILE")) {
        expect(context).not.toContain("violations detected");
      }
    }, 30000);
  });
});
