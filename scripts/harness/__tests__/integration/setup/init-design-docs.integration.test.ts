// @unit harness-api
// @layer integration

import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
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
      {
        cwd: projectRoot,
        env: process.env,
      },
    );
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
    child.stdin.end();
  });
}

target('phasegate init の設計ドキュメント配置 (ISSUE-004 Phase C Wave 2)', () => {
  describe('phasegate init で設計原則ドキュメントが配置される', () => {
    context('空のプロジェクトに対して init を実行した場合', () => {
      it('docs/folder_management_rules.md が配置されること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-design-docs-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot);

          // Assert
          expect(actual.exitCode).toBe(0);
          await expect(access(path.join(projectRoot, 'docs', 'folder_management_rules.md'))).resolves.toBeUndefined();
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);

      it('docs/principles/architecture-philosophy.md が配置されること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-design-docs-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot);

          // Assert
          expect(actual.exitCode).toBe(0);
          await expect(access(path.join(projectRoot, 'docs', 'principles', 'architecture-philosophy.md'))).resolves.toBeUndefined();
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);

      it('docs/principles/model-routing.md が配置されること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-design-docs-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot);

          // Assert
          expect(actual.exitCode).toBe(0);
          await expect(access(path.join(projectRoot, 'docs', 'principles', 'model-routing.md'))).resolves.toBeUndefined();
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);

      it('docs/principles/testing-rules.md が配置されること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-design-docs-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot);

          // Assert
          expect(actual.exitCode).toBe(0);
          await expect(access(path.join(projectRoot, 'docs', 'principles', 'testing-rules.md'))).resolves.toBeUndefined();
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);

      it('--with-husky フラグなしの場合 .husky/pre-commit が配置されないこと', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-design-docs-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot);

          // Assert
          expect(actual.exitCode).toBe(0);
          await expect(access(path.join(projectRoot, '.husky', 'pre-commit'))).rejects.toThrow();
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);
    });
  });

  describe('phasegate init --with-husky で husky フックが配置される', () => {
    context('空のプロジェクトに --with-husky を指定して init を実行した場合', () => {
      it('.husky/pre-commit が配置されること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-design-docs-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot, ['--with-husky']);

          // Assert
          expect(actual.exitCode).toBe(0);
          await expect(access(path.join(projectRoot, '.husky', 'pre-commit'))).resolves.toBeUndefined();
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);

      it('.husky/pre-commit に実行権限が付与されていること', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-design-docs-'));

        try {
          // Act
          const actual = await runInitCli(projectRoot, ['--with-husky']);

          // Assert
          expect(actual.exitCode).toBe(0);
          const actualStat = await stat(path.join(projectRoot, '.husky', 'pre-commit'));
          expect(actualStat.mode & 0o111).not.toBe(0);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);
    });
  });

  describe('phasegate init で既存ファイルがあるとスキップされる', () => {
    context('docs/folder_management_rules.md が既に存在する状態で init を実行した場合', () => {
      it('そのファイルは上書きされないこと', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-design-docs-'));
        const existingFilePath = path.join(projectRoot, 'docs', 'folder_management_rules.md');
        const existingContent = 'custom folder rules\n';

        try {
          await mkdir(path.dirname(existingFilePath), { recursive: true });
          await writeFile(existingFilePath, existingContent, 'utf-8');

          // Act
          const actual = await runInitCli(projectRoot);

          // Assert
          expect(actual.exitCode).toBe(0);
          const actualContent = await readFile(existingFilePath, 'utf-8');
          expect(actualContent).toBe(existingContent);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);
    });
  });
});
