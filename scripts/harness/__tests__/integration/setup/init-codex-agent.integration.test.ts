// @unit harness-api
// @layer integration
// @work-item-id WI-205
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
import { afterEach, describe, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, '../../../../..');
const MAIN_TS = path.join(HARNESS_ROOT, 'scripts/harness/main.ts');
const TSX_LOADER = path.join(HARNESS_ROOT, 'node_modules', 'tsx', 'dist', 'loader.mjs');
let projectRoot: string | null = null;

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface InitInspection extends CliResult {
  hasHarnessVersion: boolean;
  hasClaudeSettings: boolean;
  hasClaudeSkills: boolean;
  claudeSkillsLink: string | null;
  hasCodexHooks: boolean;
  hasCodexSkills: boolean;
  codexSkillsLink: string | null;
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

async function createProjectRoot(prefix: string): Promise<string> {
  projectRoot = await mkdtemp(path.join(tmpdir(), prefix));
  return projectRoot;
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function symlinkTarget(targetPath: string): Promise<string | null> {
  try {
    const stat = await lstat(targetPath);
    if (!stat.isSymbolicLink()) return null;
    return await readlink(targetPath);
  } catch {
    return null;
  }
}

async function runInitAndInspect(projectRoot: string, extraArgs: string[] = []): Promise<InitInspection> {
  const cli = await runInitCli(projectRoot, extraArgs);
  return {
    ...cli,
    hasHarnessVersion: await fileExists(path.join(projectRoot, 'skills', '.harness-version')),
    hasClaudeSettings: await fileExists(path.join(projectRoot, '.claude', 'settings.json')),
    hasClaudeSkills: await fileExists(path.join(projectRoot, '.claude', 'skills')),
    claudeSkillsLink: await symlinkTarget(path.join(projectRoot, '.claude', 'skills')),
    hasCodexHooks: await fileExists(path.join(projectRoot, '.codex', 'hooks.json')),
    hasCodexSkills: await fileExists(path.join(projectRoot, '.codex', 'skills')),
    codexSkillsLink: await symlinkTarget(path.join(projectRoot, '.codex', 'skills')),
  };
}

afterEach(async () => {
  if (projectRoot !== null) await rm(projectRoot, { recursive: true, force: true });
  projectRoot = null;
});

target('phasegate init --agent オプション (ISSUE-013 Wave 2)', () => {
  describe('--agent claude (デフォルト) の挙動', () => {
    context('--agent 指定なしの場合', () => {
      it('.claude/ が配置され .codex/ は配置されないこと', async () => {
        // Arrange
        const projectRoot = await createProjectRoot('init-agent-claude-');

        // Act
        const actual = await runInitAndInspect(projectRoot);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('agent: claude');
        expect(actual.hasHarnessVersion).toBe(true);
        expect(actual.hasClaudeSkills).toBe(true);
        expect(actual.claudeSkillsLink).toBe('../skills');
        expect(actual.hasCodexHooks).toBe(false);
        expect(actual.hasCodexSkills).toBe(false);
      }, 60000);
    });
  });

  describe('--agent codex の挙動', () => {
    context('--agent codex を指定した場合', () => {
      it('.codex/hooks.json が配置されること', async () => {
        // Arrange
        const projectRoot = await createProjectRoot('init-agent-codex-');

        // Act
        const actual = await runInitAndInspect(projectRoot, ['--agent', 'codex']);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('agent: codex');
        expect(actual.stdout).toContain('.codex/hooks.json deployed');
        expect(actual.stdout).toContain('.codex/skills linked to skills/');
        expect(actual.hasCodexHooks).toBe(true);
        expect(actual.hasHarnessVersion).toBe(true);
        expect(actual.hasCodexSkills).toBe(true);
        expect(actual.codexSkillsLink).toBe('../skills');
      }, 60000);

      it('Codex 有効化手順 (codex features enable hooks) が次ステップに案内されること', async () => {
        // Arrange
        const projectRoot = await createProjectRoot('init-agent-codex-');

        // Act
        const actual = await runInitAndInspect(projectRoot, ['--agent', 'codex']);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('codex features enable hooks');
        expect(actual.stdout).toContain('codex-integration.md');
      }, 60000);

      it('--agent codex 単独指定時は .claude/ は配置されないこと', async () => {
        // Arrange
        const projectRoot = await createProjectRoot('init-agent-codex-only-');

        // Act
        const actual = await runInitAndInspect(projectRoot, ['--agent', 'codex']);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.hasClaudeSettings).toBe(false);
        expect(actual.hasClaudeSkills).toBe(false);
      }, 60000);
    });
  });

  describe('--agent both の挙動', () => {
    context('--agent both を指定した場合', () => {
      it('.claude/settings.json と .codex/hooks.json の両方が配置されること', async () => {
        // Arrange
        const projectRoot = await createProjectRoot('init-agent-both-');

        // Act
        const actual = await runInitAndInspect(projectRoot, ['--agent', 'both']);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('agent: both');
        expect(actual.hasClaudeSettings).toBe(true);
        expect(actual.hasCodexHooks).toBe(true);
        expect(actual.hasHarnessVersion).toBe(true);
        expect(actual.claudeSkillsLink).toBe('../skills');
        expect(actual.codexSkillsLink).toBe('../skills');
      }, 60000);

      it('init 直後の doctor が package-json-devdep-missing で失敗しないよう package.json を作成すること', async () => {
        // Arrange
        const projectRoot = await createProjectRoot('init-agent-both-package-');

        // Act
        const actual = await runInitCli(projectRoot, ['--agent', 'both', '--with-husky', '--with-ci']);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('package.json created with phasegate devDependency');
        const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf-8')) as {
          devDependencies?: Record<string, string>;
        };
        expect(packageJson.devDependencies?.phasegate).toMatch(/^\^\d+\.\d+\.\d+$/);
      }, 60000);
    });
  });

  describe('不正値のバリデーション', () => {
    context('--agent に未定義の値を指定した場合', () => {
      it('exit 2 でエラー終了すること', async () => {
        // Arrange
        const projectRoot = await createProjectRoot('init-agent-invalid-');

        // Act
        const actual = await runInitCli(projectRoot, ['--agent', 'cursor']);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toContain('Invalid --agent value');
      }, 60000);
    });
  });
});
