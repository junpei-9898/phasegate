// @unit agent-integration
// @layer integration
// @story H11-01
// @work-item-id WI-013
// @work-item-id WI-209

/**
 * ISSUE-013 Wave 3 / C-4: SessionStart hook の動作検証。
 *
 * Codex 公式スキーマ `{hookSpecificOutput: {hookEventName, additionalContext}}` に
 * 準拠した JSON を stdout に出力し、phase-gate 関連の情報を含むことを確認する。
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

function runCli(args: string[], cwd: string, stdin?: string, timeoutMs = 20_000): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', MAIN_TS, ...args], {
      cwd,
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error(`CLI timed out after ${timeoutMs}ms: ${args.join(' ')}\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    }, timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

async function createBlockedUnitProject(): Promise<string> {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'session-start-blocked-'));
  const unitDir = path.join(projectRoot, 'docs', 'product', 'construction', 'blocked-unit');
  await mkdir(unitDir, { recursive: true });
  await writeFile(path.join(unitDir, 'domain_model.md'), '# stub', 'utf8');
  return projectRoot;
}

target('SessionStart hook (ISSUE-013 Wave 3 / C-4)', () => {
  describe('Codex 公式スキーマ準拠の出力', () => {
    it('hookSpecificOutput.hookEventName = "SessionStart" を含む JSON を返す', async () => {
      // Arrange
      const stdin = JSON.stringify({
        session_id: 'test-session',
        cwd: HARNESS_ROOT,
        hook_event_name: 'SessionStart',
      });

      // Act
      const actual = await runCli(['hook', 'session-start'], HARNESS_ROOT, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(JSON.parse(actual.stdout).hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(typeof JSON.parse(actual.stdout).hookSpecificOutput.additionalContext).toBe('string');
    }, 30000);

    it('additionalContext に AIDLC / phase-gate の運用ルールが含まれる', async () => {
      // Arrange
      const stdin = JSON.stringify({ hook_event_name: 'SessionStart' });

      // Act
      const actual = await runCli(['hook', 'session-start'], HARNESS_ROOT, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(JSON.parse(actual.stdout).hookSpecificOutput.additionalContext).toContain('Phasegate');
      expect(JSON.parse(actual.stdout).hookSpecificOutput.additionalContext).toContain('Protected files');
      expect(JSON.parse(actual.stdout).hookSpecificOutput.additionalContext).toContain('phase-gate');
    }, 30000);

    it('配布済みプロジェクトでは保護ファイル一覧に biome.json が含まれる (default pattern)', async () => {
      // Arrange
      const stdin = JSON.stringify({ hook_event_name: 'SessionStart' });

      // Act: HARNESS_ROOT の phasegate.config.json は tsconfig.json / package.json を
      //   protectedFiles.exclude しているため、残りのデフォルトパターンが期待される
      const actual = await runCli(['hook', 'session-start'], HARNESS_ROOT, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(JSON.parse(actual.stdout).hookSpecificOutput.additionalContext).toContain('biome.json');
    }, 30000);
  });

  describe('phasegate.config.json が無い環境', () => {
    it('config 未発見でも exit 0 でデフォルトパターンを出力する', async () => {
      // Arrange
      const projectRoot = await mkdtemp(path.join(tmpdir(), 'session-start-no-config-'));
      const stdin = JSON.stringify({ hook_event_name: 'SessionStart' });

      // Act
      const actual = await runCli(['hook', 'session-start'], projectRoot, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(JSON.parse(actual.stdout).hookSpecificOutput.additionalContext).toContain('biome.json');
      expect(JSON.parse(actual.stdout).hookSpecificOutput.additionalContext).toContain('tsconfig.json');
      void rm(projectRoot, { recursive: true, force: true });
    }, 30000);
  });

  describe('phase-gate でブロック中の Unit 検出', () => {
    it('logical_design.md / domain_model.md が欠けている Unit を一覧化する', async () => {
      // Arrange: 一時プロジェクトを作って、設計文書が欠けている Unit を仕込む。
      //   main.ts 起動時の config スキーマ検証を避けるため phasegate.config.json は作らない。
      //   その場合 findBlockedUnits は default path `docs/product/construction` を使う。
      const projectRoot = await createBlockedUnitProject();
      const stdin = JSON.stringify({ hook_event_name: 'SessionStart' });

      // Act
      const actual = await runCli(['hook', 'session-start'], projectRoot, stdin);

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(JSON.parse(actual.stdout).hookSpecificOutput.additionalContext).toContain('blocked-unit');
      expect(JSON.parse(actual.stdout).hookSpecificOutput.additionalContext).toContain('logical_design.md');
      void rm(projectRoot, { recursive: true, force: true });
    }, 30000);
  });
});
