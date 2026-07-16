// @unit harness-api
// @layer integration
// @story H13-04
// @work-item-id WI-273

import { spawn } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { context, target } from "../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/harness/__tests__/integration/setup -> repo root は 5 階層上。
const REPO_ROOT = path.resolve(__dirname, "../../../../..");
// テスト対象はリポジトリ内の実ファイル（live 版）を直接叩く。
// 配布テンプレート版（templates/.claude/scripts/deny-check.sh）は WI-272 の
// deny-check-template-sync.test.ts が byte 一致を保証しているため、挙動テストは
// 二重実行しない（テスト設計は docs/inception/_cross/WI-273/description.md 参照）。
const LIVE_HOOK_PATH = path.join(REPO_ROOT, ".claude", "scripts", "deny-check.sh");

const RC_ALLOW = 0;
const RC_DENY = 2;

/**
 * deny-check.sh を bash 子プロセスとして直接起動し、PreToolUse JSON を stdin に
 * 流して exit code を返す。node_modules/.bin に依存せず /bin/bash を直接呼ぶため、
 * worktree の node_modules 欠落問題の影響を受けない。
 *
 * ここで渡す command は hook に JSON として渡すテストデータであり、テストプロセスが
 * その中身を実行することは一切ない（deny 対象コマンドの文字列も同様）。
 */
function runHook(command: string, toolName = "Bash"): Promise<number> {
  const payload = JSON.stringify({
    tool_name: toolName,
    tool_input: toolName === "Bash" ? { command } : { file_path: command },
  });
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [LIVE_HOOK_PATH], {
      cwd: REPO_ROOT,
      env: { ...process.env, CLAUDE_PROJECT_DIR: REPO_ROOT },
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      resolve(code ?? -1);
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

target("deny-check.sh 挙動回帰 (WI-273)", () => {
  context("git allowlist: 許可サブコマンドは通過する", () => {
    const allowedCommands = [
      "git status",
      "git log --oneline",
      "git diff HEAD",
      "git add -A",
      "git commit -m 'msg'",
      "git tag v1.0.0",
      "git branch",
      "git fetch origin",
      "git worktree list",
      "git rev-parse HEAD",
    ];
    for (const command of allowedCommands) {
      it(`「${command}」は allowlist に含まれるため rc=0 になること`, async () => {
        // Arrange & Act
        const actual = await runHook(command);
        // Assert
        expect(actual).toBe(RC_ALLOW);
      });
    }
  });

  context("git allowlist: 非許可サブコマンドは deny される", () => {
    const deniedCommands = [
      "git checkout main",
      "git switch main",
      "git reset --hard HEAD",
      "git rebase main",
      "git merge feature",
      "git cherry-pick abc123",
      "git stash",
      "git update-ref refs/heads/x HEAD",
      "git clean -fd",
      "git revert HEAD",
    ];
    for (const command of deniedCommands) {
      it(`「${command}」は allowlist 外のため rc=2 になること`, async () => {
        // Arrange & Act
        const actual = await runHook(command);
        // Assert
        expect(actual).toBe(RC_DENY);
      });
    }
  });

  context("グローバルフラグ挟み込み越しでも deny が継続する", () => {
    const deniedCommands = [
      "git -C /tmp/repo checkout main",
      "git --no-pager reset --hard HEAD",
      "git -c core.editor=vi rebase main",
    ];
    for (const command of deniedCommands) {
      it(`「${command}」はグローバルフラグ越しでも rc=2 になること`, async () => {
        // Arrange & Act
        const actual = await runHook(command);
        // Assert
        expect(actual).toBe(RC_DENY);
      });
    }

    it("「git -C /tmp/repo status」はグローバルフラグ越しの許可コマンドとして rc=0 になること", async () => {
      // Arrange & Act
      const actual = await runHook("git -C /tmp/repo status");
      // Assert
      expect(actual).toBe(RC_ALLOW);
    });
  });

  context("連鎖演算子・subshell に隠したセグメントも検査される", () => {
    const deniedCommands = [
      "git status && git checkout main",
      "git status ; git reset --hard HEAD",
      "git status | git switch main",
      "echo x; git rebase main",
      "true && (git merge feature)",
    ];
    for (const command of deniedCommands) {
      it(`「${command}」は隠しセグメントの deny が検出され rc=2 になること`, async () => {
        // Arrange & Act
        const actual = await runHook(command);
        // Assert
        expect(actual).toBe(RC_DENY);
      });
    }

    it("「git status && git log」は全セグメントが許可コマンドのため rc=0 になること", async () => {
      // Arrange & Act
      const actual = await runHook("git status && git log");
      // Assert
      expect(actual).toBe(RC_ALLOW);
    });
  });

  context("symbolic-ref: read 形は通過し write/delete 形は deny される", () => {
    const readForms = [
      "git symbolic-ref HEAD",
      "git symbolic-ref --short HEAD",
      "git symbolic-ref -q HEAD",
    ];
    for (const command of readForms) {
      it(`「${command}」は read 形のため rc=0 になること`, async () => {
        // Arrange & Act
        const actual = await runHook(command);
        // Assert
        expect(actual).toBe(RC_ALLOW);
      });
    }

    const writeForms = [
      "git symbolic-ref HEAD refs/heads/x",
      "git symbolic-ref -d HEAD",
      "git symbolic-ref --delete HEAD",
      "git -C /tmp/repo symbolic-ref HEAD refs/heads/x",
    ];
    for (const command of writeForms) {
      it(`「${command}」は write/delete 形のため rc=2 になること`, async () => {
        // Arrange & Act
        const actual = await runHook(command);
        // Assert
        expect(actual).toBe(RC_DENY);
      });
    }
  });

  context("config: read 形は通過し write 形は deny される", () => {
    const readForms = [
      "git config --list",
      "git config -l",
      "git config --get user.name",
      "git config --get-all user.email",
      "git config --get-regexp branch",
      "git config user.name",
      "git config --global --list",
      "git config --local --get user.name",
    ];
    for (const command of readForms) {
      it(`「${command}」は read 形のため rc=0 になること`, async () => {
        // Arrange & Act
        const actual = await runHook(command);
        // Assert
        expect(actual).toBe(RC_ALLOW);
      });
    }

    const writeForms = [
      "git config core.hooksPath /tmp/x",
      "git config user.name attacker",
      "git config --global user.email a@b.c",
      "git config --unset user.name",
      "git config --add remote.origin.url x",
      "git config --edit",
      "git config --remove-section branch.main",
      "git config set core.hooksPath /tmp/x",
      "git config unset user.name",
      "git -C /tmp/repo config core.hooksPath /tmp/x",
    ];
    for (const command of writeForms) {
      it(`「${command}」は write 形のため rc=2 になること`, async () => {
        // Arrange & Act
        const actual = await runHook(command);
        // Assert
        expect(actual).toBe(RC_DENY);
      });
    }
  });

  context("非 git deny パターン（settings.json permissions.deny）が回帰なく効く", () => {
    const deniedCommands = ["rm -rf /tmp/x", "rm -rf *", "sudo whoami", "sudo rm -rf /"];
    for (const command of deniedCommands) {
      it(`「${command}」は deny パターンに一致し rc=2 になること`, async () => {
        // Arrange & Act
        const actual = await runHook(command);
        // Assert
        expect(actual).toBe(RC_DENY);
      });
    }

    it("「echo && rm -rf /tmp/x」は隠しセグメントの deny パターンが検出され rc=2 になること", async () => {
      // Arrange & Act
      const actual = await runHook("echo ok && rm -rf /tmp/x");
      // Assert
      expect(actual).toBe(RC_DENY);
    });
  });

  context("git 以外の通常コマンド・非 Bash ツールは素通りする", () => {
    const allowedCommands = ["echo hello", "ls -la", "cat README.md", "npm test", "node --version"];
    for (const command of allowedCommands) {
      it(`「${command}」は deny 対象でないため rc=0 になること`, async () => {
        // Arrange & Act
        const actual = await runHook(command);
        // Assert
        expect(actual).toBe(RC_ALLOW);
      });
    }

    it("Read ツール（非 Bash）の JSON は検査対象外のため rc=0 になること", async () => {
      // Arrange & Act
      const actual = await runHook("/etc/passwd", "Read");
      // Assert
      expect(actual).toBe(RC_ALLOW);
    });
  });
});
