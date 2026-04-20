// @unit agent-integration
// @layer integration
// @story ISSUE-013

/**
 * ISSUE-013 Wave 3 / C-5: UserPromptSubmit hook の動作検証。
 *
 * 毎ターン発火するため簡潔な出力にする方針。SessionStart と出力フォーマットが
 * 異なる (運用ルールの再掲を省く) ことを確認する。
 */

import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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

function runCli(args: string[], cwd: string, stdin?: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', MAIN_TS, ...args], { cwd, env: process.env });
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

target('UserPromptSubmit hook (ISSUE-013 Wave 3 / C-5)', () => {
  describe('Codex 公式スキーマ準拠の出力', () => {
    it('hookSpecificOutput.hookEventName = "UserPromptSubmit" を含む JSON を返す', async () => {
      // Arrange
      const stdin = JSON.stringify({
        hook_event_name: 'UserPromptSubmit',
        prompt: 'test prompt',
      });

      // Act
      const actual = await runCli(['hook', 'user-prompt-submit'], HARNESS_ROOT, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      const parsed = JSON.parse(actual.stdout);
      expect(parsed.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
      expect(typeof parsed.hookSpecificOutput.additionalContext).toBe('string');
    }, 30000);

    it('additionalContext は SessionStart より簡潔 (運用ルールの本文を再掲しない)', async () => {
      // Arrange
      const stdin = JSON.stringify({ hook_event_name: 'UserPromptSubmit' });

      // Act
      const actual = await runCli(['hook', 'user-prompt-submit'], HARNESS_ROOT, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      const parsed = JSON.parse(actual.stdout);
      const context = parsed.hookSpecificOutput.additionalContext as string;
      expect(context).toContain('refresh');
      expect(context).toContain('Protected files');
      // SessionStart に含まれていたフル運用ルール本文は含まない
      expect(context).not.toContain('Do NOT write to protected files without going through');
    }, 30000);
  });

  describe('phase-gate で新たにブロックされた Unit を動的に検知', () => {
    it('setup 中に追加された設計文書欠けの Unit を反映する', async () => {
      // Arrange: 新しい blocked unit を prompt 間で作る状況を想定
      const projectRoot = await mkdtemp(path.join(tmpdir(), 'user-prompt-submit-dyn-'));
      const unitDir = path.join(projectRoot, 'docs', 'product', 'construction', 'dynamic-blocked');
      await mkdir(unitDir, { recursive: true });
      // どちらの設計文書も欠落
      await writeFile(path.join(unitDir, 'placeholder.txt'), '', 'utf8');

      const stdin = JSON.stringify({ hook_event_name: 'UserPromptSubmit' });

      try {
        // Act
        const actual = await runCli(['hook', 'user-prompt-submit'], projectRoot, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.stdout);
        const context = parsed.hookSpecificOutput.additionalContext as string;
        expect(context).toContain('dynamic-blocked');
        expect(context).toContain('story-implementor');
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    }, 30000);
  });

  describe('エラー耐性', () => {
    it('stdin が空でも exit 0 で JSON を返す', async () => {
      // Arrange
      const stdin = '';

      // Act
      const actual = await runCli(['hook', 'user-prompt-submit'], HARNESS_ROOT, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(() => JSON.parse(actual.stdout)).not.toThrow();
    }, 30000);
  });
});
