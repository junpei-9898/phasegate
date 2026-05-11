// @unit harness-api
// @layer integration
// @story H11-06

/**
 * ISSUE-013 Wave 2 / B-3: `phasegate init --agent codex` / `--agent both` の
 * 挙動を検証する統合テスト。
 *
 * Codex 向けテンプレート `.codex/hooks.json` が `--agent codex`/`both` 指定時のみ
 * 配置されること、`--agent claude` (デフォルト) では配置されないことを確認する。
 */

import { spawn } from 'node:child_process';
import { access, lstat, mkdtemp, readFile, readlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, '../../../../..');
const MAIN_TS = path.join(HARNESS_ROOT, 'scripts/harness/main.ts');
const TSX_LOADER = path.join(HARNESS_ROOT, 'node_modules', 'tsx', 'dist', 'loader.mjs');

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runInitCli(projectRoot: string, extraArgs: string[] = []): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['--import', TSX_LOADER, MAIN_TS, 'init', '--name', 'test-project', '--skills', 'core', ...extraArgs],
      { cwd: projectRoot, env: process.env },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => {
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
    child.stdin.end();
  });
}

target('phasegate init --agent オプション (ISSUE-013 Wave 2)', () => {
  describe('--agent claude (デフォルト) の挙動', () => {
    context('--agent 指定なしの場合', () => {
      it('.claude/ が配置され .codex/ は配置されないこと', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-agent-claude-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot);

          // Assert
          expect(actual.exitCode).toBe(0);
          expect(actual.stdout).toContain('agent: claude');
          await expect(access(path.join(projectRoot, 'skills', '.harness-version'))).resolves.toBeUndefined();
          await expect(lstat(path.join(projectRoot, '.claude', 'skills'))).resolves.toMatchObject({
            isSymbolicLink: expect.any(Function),
          });
          const actualLink = await readlink(path.join(projectRoot, '.claude', 'skills'));
          expect(actualLink).toBe('../skills');
          await expect(access(path.join(projectRoot, '.codex', 'hooks.json'))).rejects.toThrow();
          await expect(access(path.join(projectRoot, '.codex', 'skills'))).rejects.toThrow();
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);
    });
  });

  describe('--agent codex の挙動', () => {
    context('--agent codex を指定した場合', () => {
      it('.codex/hooks.json が配置されること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-agent-codex-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot, ['--agent', 'codex']);

          // Assert
          expect(actual.exitCode).toBe(0);
          expect(actual.stdout).toContain('agent: codex');
          expect(actual.stdout).toContain('.codex/hooks.json deployed');
          expect(actual.stdout).toContain('.codex/skills linked to skills/');
          await expect(access(path.join(projectRoot, '.codex', 'hooks.json'))).resolves.toBeUndefined();
          await expect(access(path.join(projectRoot, 'skills', '.harness-version'))).resolves.toBeUndefined();
          const actualStats = await lstat(path.join(projectRoot, '.codex', 'skills'));
          expect(actualStats.isSymbolicLink()).toBe(true);
          const actualLink = await readlink(path.join(projectRoot, '.codex', 'skills'));
          expect(actualLink).toBe('../skills');
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);

      it('Codex 有効化手順 (codex features enable codex_hooks) が次ステップに案内されること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-agent-codex-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot, ['--agent', 'codex']);

          // Assert
          expect(actual.exitCode).toBe(0);
          expect(actual.stdout).toContain('codex features enable codex_hooks');
          expect(actual.stdout).toContain('codex-integration.md');
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);

      it('--agent codex 単独指定時は .claude/ は配置されないこと', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-agent-codex-only-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot, ['--agent', 'codex']);

          // Assert
          expect(actual.exitCode).toBe(0);
          await expect(access(path.join(projectRoot, '.claude', 'settings.json'))).rejects.toThrow();
          await expect(access(path.join(projectRoot, '.claude', 'skills'))).rejects.toThrow();
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);
    });
  });

  describe('--agent both の挙動', () => {
    context('--agent both を指定した場合', () => {
      it('.claude/settings.json と .codex/hooks.json の両方が配置されること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-agent-both-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot, ['--agent', 'both']);

          // Assert
          expect(actual.exitCode).toBe(0);
          expect(actual.stdout).toContain('agent: both');
          await expect(access(path.join(projectRoot, '.claude', 'settings.json'))).resolves.toBeUndefined();
          await expect(access(path.join(projectRoot, '.codex', 'hooks.json'))).resolves.toBeUndefined();
          await expect(access(path.join(projectRoot, 'skills', '.harness-version'))).resolves.toBeUndefined();
          expect((await lstat(path.join(projectRoot, '.claude', 'skills'))).isSymbolicLink()).toBe(true);
          expect((await lstat(path.join(projectRoot, '.codex', 'skills'))).isSymbolicLink()).toBe(true);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);

      it('init 直後の doctor が package-json-devdep-missing で失敗しないよう package.json を作成すること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-agent-both-package-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot, ['--agent', 'both', '--with-husky', '--with-ci']);

          // Assert
          expect(actual.exitCode).toBe(0);
          expect(actual.stdout).toContain('package.json created with phasegate devDependency');
          const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf-8')) as {
            devDependencies?: Record<string, string>;
          };
          expect(packageJson.devDependencies?.phasegate).toMatch(/^\^\d+\.\d+\.\d+$/);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);
    });
  });

  describe('不正値のバリデーション', () => {
    context('--agent に未定義の値を指定した場合', () => {
      it('exit 2 でエラー終了すること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-agent-invalid-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot, ['--agent', 'cursor']);

          // Assert
          expect(actual.exitCode).toBe(2);
          expect(actual.stderr).toContain('Invalid --agent value');
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);
    });
  });
});
