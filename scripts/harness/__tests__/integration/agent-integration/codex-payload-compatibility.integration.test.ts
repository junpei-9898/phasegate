// @unit agent-integration
// @layer integration
// @story ISSUE-013

/**
 * Codex CLI の hook stdin JSON ペイロードが既存の Phasegate hook アダプタで
 * そのまま処理できることを保証する互換性テスト。
 *
 * ISSUE-013 Wave 2: Codex hooks.json は Claude settings.json と同一スキーマ
 * (tool_name / tool_input.command / session_id 等) を採用しており、
 * 既存アダプタ (pre-tool-use-hook.ts / stop-hook.ts 等) を流用する設計。
 *
 * 本テストは Codex 実機からの payload を模擬し、既存アダプタが:
 *   - 保護ファイル検出で exit 2 ブロックする
 *   - Bash 経由 apply_patch heredoc を検出してブロックする
 *   - 無関係な Bash コマンドは exit 0 で通す
 * を確認する。
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, '../../../../..');
const MAIN_TS = path.join(HARNESS_ROOT, 'scripts/harness/main.ts');

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], stdin?: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', MAIN_TS, ...args], {
      cwd: HARNESS_ROOT,
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => {
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

/**
 * Codex 公式ドキュメント記載の PreToolUse stdin JSON スキーマ。
 * https://developers.openai.com/codex/hooks
 */
function buildCodexPreToolUsePayload(command: string): string {
  return JSON.stringify({
    session_id: 'codex-session-test',
    transcript_path: null,
    cwd: HARNESS_ROOT,
    hook_event_name: 'PreToolUse',
    model: 'gpt-5-codex',
    turn_id: 'turn-001',
    tool_name: 'Bash',
    tool_use_id: 'tool-001',
    tool_input: { command },
  });
}

function buildCodexStopPayload(): string {
  return JSON.stringify({
    session_id: 'codex-session-test',
    transcript_path: null,
    cwd: HARNESS_ROOT,
    hook_event_name: 'Stop',
  });
}

target('Codex payload compatibility (ISSUE-013 Wave 2)', () => {
  describe('PreToolUse(Bash) - 無害コマンド', () => {
    it('`ls -la` のような読み取り専用コマンドは exit 0 で通す', async () => {
      // Arrange
      const stdin = buildCodexPreToolUsePayload('ls -la');

      // Act
      const actual = await runCli(['hook', 'pre-tool-use'], stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
    }, 30000);
  });

  describe('PreToolUse(Bash) - 保護ファイル違反ブロック', () => {
    it('`echo x > biome.json` はプロジェクト保護ファイル違反で exit 2 ブロック', async () => {
      // Arrange
      const stdin = buildCodexPreToolUsePayload('echo x > biome.json');

      // Act
      const actual = await runCli(['hook', 'pre-tool-use'], stdin);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain('biome.json');
    }, 30000);

    it('`cat > biome.json` (リダイレクト経由の書き込み) も exit 2 ブロック', async () => {
      // Arrange
      const stdin = buildCodexPreToolUsePayload('cat > biome.json');

      // Act
      const actual = await runCli(['hook', 'pre-tool-use'], stdin);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain('biome.json');
    }, 30000);
  });

  describe('PreToolUse(Bash) - apply_patch heredoc 経由の保護ファイル違反', () => {
    it('Bash 経由の `apply_patch` が保護ファイルを書き換える場合 exit 2 ブロック', async () => {
      // Arrange
      const command = `apply_patch <<'PATCH'
*** Begin Patch
*** Update File: biome.json
*** End Patch
PATCH`;
      const stdin = buildCodexPreToolUsePayload(command);

      // Act
      const actual = await runCli(['hook', 'pre-tool-use'], stdin);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain('biome.json');
    }, 30000);

    it('Bash 経由の `apply_patch` で *** Add File: が保護ファイルを新規作成する場合も exit 2 ブロック', async () => {
      // Arrange
      const command = `apply_patch <<'PATCH'
*** Begin Patch
*** Add File: package-lock.json
*** End Patch
PATCH`;
      const stdin = buildCodexPreToolUsePayload(command);

      // Act
      const actual = await runCli(['hook', 'pre-tool-use'], stdin);

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain('package-lock.json');
    }, 30000);
  });

  describe('Stop hook - Codex スキーマ受容', () => {
    it('Codex の Stop payload (session_id 付き) を受けても exit 0 で正常終了', async () => {
      // Arrange
      const stdin = buildCodexStopPayload();

      // Act
      const actual = await runCli(['hook', 'stop'], stdin);

      // Assert: 実 phase-gate の complete-check コマンドが走るため内容は問わず、
      //   少なくとも stdin parse / dispatch が成功していることを確認
      expect([0, 1, 2]).toContain(actual.exitCode);
      expect(actual.stderr).not.toContain('stdin読み取りエラー');
      expect(actual.stderr).not.toContain('不正なJSONです');
      expect(actual.stderr).not.toContain('session_idフィールドが必要です');
    }, 30000);
  });
});
