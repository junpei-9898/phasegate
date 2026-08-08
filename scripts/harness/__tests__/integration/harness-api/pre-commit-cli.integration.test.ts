// @unit harness-api
// @layer integration
// @story H03-02
// @work-item-id WI-385

import { execSync, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
      {
        cwd,
        env,
      },
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

target("pre-commit CLI 統合検証 (ISSUE-005 P0-1)", () => {
  context("pre-commit サブコマンドの起動", () => {
    it("モジュール解決に失敗せず起動できること (Cannot find module 回帰防止)", async () => {
      // Arrange: staged files が無い一時 git ワークツリーを作成
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-pc-"));
      try {
        // Act
        const actual = await runCli(["pre-commit"], workDir);
        // Assert: モジュール解決エラーが出ないこと
        expect(actual.stderr).not.toContain("Cannot find module");
        expect(actual.stderr).not.toContain("core/config-loader");
        expect(actual.stderr).not.toContain("core/metadata-parser");
        expect(actual.stderr).not.toContain("core/error-reporter");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);

    it("staged ファイルが無い場合は exit 0 で終了すること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-pc-"));
      try {
        // Act — git 管理外ディレクトリで実行 → staged files は空
        const actual = await runCli(["pre-commit"], workDir);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain("No staged files to check");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("staged に .md が含まれる場合 (ISSUE-008 Phase B-3)", () => {
    // IT-PC-09
    it(".md のみ staged な場合、pre-commit は .ts 欠落でスキップせず .md を検査する", async () => {
      // Arrange — 一時 git ワークツリーを作成し .md を staged 済みにする
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-pc-md-"));
      try {
        execSync("git init -q", { cwd: workDir });
        execSync("git config user.email test@example.com", { cwd: workDir });
        execSync("git config user.name Test", { cwd: workDir });
        const mdDir = path.join(workDir, "docs/product/construction/foo");
        await mkdir(mdDir, { recursive: true });
        await writeFile(path.join(mdDir, "logical_design.md"), "# foo\n\nbody\n");
        execSync("git add docs/product/construction/foo/logical_design.md", {
          cwd: workDir,
        });
        // Act
        const actual = await runCli(["pre-commit"], workDir);
        // Assert — 旧メッセージの回帰防止
        expect(actual.stdout).not.toContain("No staged files to check");
        expect(actual.stdout).toContain("メタデータ注釈");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context("commit-msg サブコマンドの起動 (ISSUE-026 Phase D-4)", () => {
    // IT-PC-10
    it("WI document staged時にcommit messageのWork-Item trailer欠落を検出する", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-cm-wi-"));
      try {
        execSync("git init -q", { cwd: workDir });
        execSync("git config user.email test@example.com", { cwd: workDir });
        execSync("git config user.name Test", { cwd: workDir });

        const wiDir = path.join(workDir, "docs/inception/_cross/WI-026");
        await mkdir(wiDir, { recursive: true });
        await writeFile(
          path.join(wiDir, "description.md"),
          [
            "# WI-026",
            "",
            "@unit ci-governance",
            "@layer inception",
            "@story-id H13-04",
            "@work-item-id WI-026",
            "",
          ].join("\n"),
        );
        const messagePath = path.join(workDir, "COMMIT_EDITMSG");
        await writeFile(messagePath, "fix: update WI document\n", "utf-8");
        execSync("git add docs/inception/_cross/WI-026/description.md", {
          cwd: workDir,
        });

        // Act
        const actual = await runCli(["commit-msg", messagePath], workDir);

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stdout).toContain("Work-Item trailer");
        expect(actual.stdout).toContain("Work-Item: WI-XXX");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);

    // IT-PC-11
    it("WI document staged時にcommit messageのWork-Item trailerがあればtrailer検証は通過する", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-cm-wi-"));
      try {
        execSync("git init -q", { cwd: workDir });
        execSync("git config user.email test@example.com", { cwd: workDir });
        execSync("git config user.name Test", { cwd: workDir });

        const wiDir = path.join(workDir, "docs/inception/_cross/WI-026");
        await mkdir(wiDir, { recursive: true });
        await writeFile(
          path.join(wiDir, "description.md"),
          [
            "# WI-026",
            "",
            "@unit ci-governance",
            "@layer inception",
            "@story-id H13-04",
            "@work-item-id WI-026",
            "",
          ].join("\n"),
        );
        const messagePath = path.join(workDir, "COMMIT_EDITMSG");
        await writeFile(messagePath, "fix: update WI document\n\nWork-Item: WI-026\n", "utf-8");
        execSync("git add docs/inception/_cross/WI-026/description.md", {
          cwd: workDir,
        });

        // Act
        const actual = await runCli(["commit-msg", messagePath], workDir);

        // Assert
        expect(actual.stdout).toContain("Work-Item trailer");
        expect(actual.stdout).toContain("Work-Item trailer is present");
        expect(actual.stdout).not.toContain("Commit message must include");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });
});
