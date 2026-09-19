// @unit agent-integration
// @work-item-id WI-220
// @layer integration
// @story H11-02
// @work-item-id WI-385
// @work-item-id WI-323

/**
 * WI-323: hook stdin payload の必須フィールド欠落時の挙動検証。
 *
 * 方針 (WI-314 / github#40 で確立): ゲート機能を持たない hook は環境不備で
 * 開発フローを止めない (fail-open)。
 *
 * - stop hook: session_id 欠落 → 警告 + SESSION_ID_MISSING 記録 + exit 0
 * - post-tool-use hook: tool_name 欠落 → 警告 + TOOL_NAME_MISSING 記録 + exit 0
 * - pre-tool-use hook: 書き込みゲートなので tool_name 欠落は exit 2 の
 *   fail-closed を維持する (回帰ガード)
 */

import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
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

function runHook(args: string[], cwd: string, stdin: string): Promise<CliResult> {
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
    child.stdin.write(stdin);
    child.stdin.end();
  });
}

async function readSkipEvents(projectRoot: string): Promise<Array<{ hookType: string; reason: string }>> {
  const raw = await readFile(path.join(projectRoot, ".phasegate", "hook-skip-events.jsonl"), "utf8");
  return raw
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as { hookType: string; reason: string });
}

target("hook 必須フィールド欠落時の fail-open / fail-closed (WI-323)", () => {
  it('Postの不正JSONを成功にせず次の正常Readで再開できること', async () => {
    // Arrange
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'wi220-post-invalid-'));
    try {
      // Act
      const invalid = await runHook(['hook', 'post-tool-use'], projectRoot, '{ invalid');
      const resumed = await runHook(['hook', 'post-tool-use'], projectRoot, JSON.stringify({ tool_name: 'Read' }));
      // Assert
      expect(invalid.exitCode).toBe(2);
      expect(invalid.stderr).toContain('不正なJSON');
      expect(resumed).toEqual({ exitCode: 0, stdout: '', stderr: '' });
      await expect(readFile(path.join(projectRoot, '.phasegate/hook-skip-events.jsonl'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  }, 60000);

  it('Postの設定I/O異常は状態を保持して診断し正規修復後に同じpayloadを再開できること', async () => {
    // Arrange: the fixture owner introduces and repairs the fault, not the hook.
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'wi220-post-io-'));
    const configPath = path.join(projectRoot, 'phasegate.config.json');
    const payload = JSON.stringify({ cwd: projectRoot, tool_name: 'Write', tool_input: { file_path: path.join(projectRoot, 'notes.md') } });
    try {
      await mkdir(configPath);
      await writeFile(path.join(projectRoot, 'notes.md'), '# Preserve user notes\n');
      // Act / Assert
      const invalid = await runHook(['hook', 'post-tool-use'], projectRoot, payload);
      expect(invalid.exitCode).toBe(2);
      expect(invalid.stderr).toContain('EISDIR');
      expect((await stat(configPath)).isDirectory()).toBe(true);
      expect(await readFile(path.join(projectRoot, 'notes.md'), 'utf8')).toBe('# Preserve user notes\n');
      await rm(configPath, { recursive: true });
      await writeFile(configPath, JSON.stringify({ project: { name: 'post-io', preset: 'standard' }, harnesses: { cascadeUpdate: false } }));
      const resumed = await runHook(['hook', 'post-tool-use'], projectRoot, payload);
      expect(resumed.exitCode).toBe(0);
      expect(resumed.stdout).toBe('');
      expect(resumed.stderr).not.toContain('EISDIR');
      expect(resumed.stderr).not.toContain('Lint診断');
      // The public CLI may retain its existing v2-schema advisory; it is not a hook failure.
      expect(await readFile(path.join(projectRoot, 'notes.md'), 'utf8')).toBe('# Preserve user notes\n');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  }, 60000);

  it('読取り完了はlintの結果を待たず無出力で終了する', async () => {
    // Arrange
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'wi220-read-only-'));
    try {
      // Act
      const actual = await runHook(['hook', 'post-tool-use'], projectRoot, JSON.stringify({ tool_name: 'Read' }));
      // Assert
      expect(actual).toEqual({ exitCode: 0, stdout: '', stderr: '' });
      await expect(readFile(path.join(projectRoot, '.phasegate/hook-skip-events.jsonl'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  }, 60000);
  describe("stop hook - session_id 欠落は fail-open", () => {
    it("stop hook は session_id 欠落 payload でも exit 0 で fail-open する (WI-323)", async () => {
      // Arrange
      const projectRoot = await mkdtemp(path.join(tmpdir(), "wi323-stop-missing-session-"));
      const stdin = JSON.stringify({ hook_event_name: "Stop", transcript_path: null });

      try {
        // Act
        const actual = await runHook(["hook", "stop"], projectRoot, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).toContain("session_id");
        expect(actual.stderr).toContain("スキップ");
        expect(actual.stderr).not.toContain("session_idフィールドが必要です");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    }, 60000);

    it("stop hook は session_id 欠落を SESSION_ID_MISSING として hook-skip-events.jsonl に記録する (WI-323)", async () => {
      // Arrange
      const projectRoot = await mkdtemp(path.join(tmpdir(), "wi323-stop-skip-record-"));
      const stdin = JSON.stringify({ hook_event_name: "Stop" });

      try {
        // Act
        await runHook(["hook", "stop"], projectRoot, stdin);
        const actual = await readSkipEvents(projectRoot);

        // Assert
        expect(actual).toContainEqual(expect.objectContaining({ hookType: "stop", reason: "SESSION_ID_MISSING" }));
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    }, 60000);
  });

  describe("post-tool-use hook - tool_name 欠落は fail-open", () => {
    it("post-tool-use hook は tool_name 欠落 payload でも exit 0 で fail-open し TOOL_NAME_MISSING を記録する (WI-323)", async () => {
      // Arrange
      const projectRoot = await mkdtemp(path.join(tmpdir(), "wi323-post-missing-tool-"));
      const stdin = JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s-1" });

      try {
        // Act
        const actual = await runHook(["hook", "post-tool-use"], projectRoot, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).toContain("tool_name");
        expect(actual.stderr).toContain("スキップ");
        expect(actual.stderr).not.toContain("tool_nameフィールドが必要です");
        const skipEvents = await readSkipEvents(projectRoot);
        expect(skipEvents).toContainEqual(
          expect.objectContaining({ hookType: "post-tool-use", reason: "TOOL_NAME_MISSING" }),
        );
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    }, 60000);
  });

  describe("pre-tool-use hook - 書き込みゲートは fail-closed を維持", () => {
    it("pre-tool-use hook は tool_name 欠落 payload で exit 2 の fail-closed を維持する (WI-323)", async () => {
      // Arrange
      const projectRoot = await mkdtemp(path.join(tmpdir(), "wi323-pre-gate-closed-"));
      const stdin = JSON.stringify({ hook_event_name: "PreToolUse", session_id: "s-1" });

      try {
        // Act
        const actual = await runHook(["hook", "pre-tool-use"], projectRoot, stdin);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toContain("tool_nameフィールドが必要です");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    }, 60000);
  });
});
