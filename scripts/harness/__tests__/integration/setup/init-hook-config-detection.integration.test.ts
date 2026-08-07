// @unit harness-api
// @layer integration
// @story H11-03
// @work-item-id WI-384

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import {
  detectFormatter,
  detectWorkspaceTargetDirs,
} from '../../../setup/skill-deployer.js';

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
      [
        '--import',
        TSX_LOADER,
        MAIN_TS,
        'init',
        '--name',
        'test-project',
        '--skills',
        'core',
        ...extraArgs,
      ],
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

target('phasegate init の hook-config.json 自動検出 (WI-087 Phase B)', () => {
  describe('workspaces 検出', () => {
    context('pnpm-workspace.yaml がある場合', () => {
      it('packages glob を展開して targetDirs を生成する', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-pnpm-'));
        try {
          await writeFile(
            path.join(projectRoot, 'pnpm-workspace.yaml'),
            "packages:\n  - 'pkg/*'\n  - 'services/*'\n",
            'utf-8',
          );
          await mkdir(path.join(projectRoot, 'pkg', 'api', 'src'), { recursive: true });
          await mkdir(path.join(projectRoot, 'pkg', 'web', 'src'), { recursive: true });
          await mkdir(path.join(projectRoot, 'services', 'worker', 'src'), { recursive: true });

          // Act
          const actual = await detectWorkspaceTargetDirs(projectRoot);

          // Assert
          expect(actual).toEqual(['pkg/api/src', 'pkg/web/src', 'services/worker/src']);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      });
    });

    context('package.json の workspaces 配列がある場合', () => {
      it('それを展開する', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-npm-ws-'));
        try {
          await writeFile(
            path.join(projectRoot, 'package.json'),
            JSON.stringify({
              name: 'mono',
              workspaces: ['packages/*'],
            }),
            'utf-8',
          );
          await mkdir(path.join(projectRoot, 'packages', 'a', 'src'), { recursive: true });
          await mkdir(path.join(projectRoot, 'packages', 'b', 'src'), { recursive: true });

          // Act
          const actual = await detectWorkspaceTargetDirs(projectRoot);

          // Assert
          expect(actual).toEqual(['packages/a/src', 'packages/b/src']);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      });
    });

    context('package.json の workspaces.packages オブジェクト形式がある場合', () => {
      it('それを展開する', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-yarn-obj-'));
        try {
          await writeFile(
            path.join(projectRoot, 'package.json'),
            JSON.stringify({
              name: 'mono',
              workspaces: { packages: ['libs/*'] },
            }),
            'utf-8',
          );
          await mkdir(path.join(projectRoot, 'libs', 'core', 'src'), { recursive: true });

          // Act
          const actual = await detectWorkspaceTargetDirs(projectRoot);

          // Assert
          expect(actual).toEqual(['libs/core/src']);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      });
    });

    context('lerna.json の packages がある場合', () => {
      it('それを展開する', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-lerna-'));
        try {
          await writeFile(
            path.join(projectRoot, 'lerna.json'),
            JSON.stringify({ packages: ['modules/*'] }),
            'utf-8',
          );
          await mkdir(path.join(projectRoot, 'modules', 'foo', 'src'), { recursive: true });

          // Act
          const actual = await detectWorkspaceTargetDirs(projectRoot);

          // Assert
          expect(actual).toEqual(['modules/foo/src']);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      });
    });

    context('workspace 定義の glob パターンに合致するが src/ が存在しない場合', () => {
      it('そのワークスペースを除外する', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-nosrc-'));
        try {
          await writeFile(
            path.join(projectRoot, 'pnpm-workspace.yaml'),
            "packages:\n  - 'pkg/*'\n",
            'utf-8',
          );
          await mkdir(path.join(projectRoot, 'pkg', 'with-src', 'src'), { recursive: true });
          await mkdir(path.join(projectRoot, 'pkg', 'no-src'), { recursive: true });

          // Act
          const actual = await detectWorkspaceTargetDirs(projectRoot);

          // Assert
          expect(actual).toEqual(['pkg/with-src/src']);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      });
    });

    context('workspace 定義が一切ない場合', () => {
      it('デフォルト ["src"] を返す', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-no-ws-'));
        try {
          await writeFile(
            path.join(projectRoot, 'package.json'),
            JSON.stringify({ name: 'single' }),
            'utf-8',
          );

          // Act
          const actual = await detectWorkspaceTargetDirs(projectRoot);

          // Assert
          expect(actual).toEqual(['src']);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      });
    });

    context('workspace 定義はあるが src/ を持つものが一切ない場合', () => {
      it('デフォルト ["src"] にフォールバックする', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-empty-ws-'));
        try {
          await writeFile(
            path.join(projectRoot, 'pnpm-workspace.yaml'),
            "packages:\n  - 'pkg/*'\n",
            'utf-8',
          );
          await mkdir(path.join(projectRoot, 'pkg', 'a'), { recursive: true });

          // Act
          const actual = await detectWorkspaceTargetDirs(projectRoot);

          // Assert
          expect(actual).toEqual(['src']);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      });
    });
  });

  describe('formatter 検出', () => {
    context('devDependencies に @biomejs/biome がある場合', () => {
      it('biome を選択する', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-biome-'));
        try {
          await writeFile(
            path.join(projectRoot, 'package.json'),
            JSON.stringify({
              name: 'p',
              devDependencies: { '@biomejs/biome': '^2.0.0' },
            }),
            'utf-8',
          );

          // Act
          const actual = await detectFormatter(projectRoot);

          // Assert
          expect(actual).toEqual({ formatter: 'biome', formatterArgs: ['check', '--write'] });
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      });
    });

    context('@biomejs/biome 不在 + prettier 存在の場合', () => {
      it('eslint-prettier を選択する', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-prettier-'));
        try {
          await writeFile(
            path.join(projectRoot, 'package.json'),
            JSON.stringify({
              name: 'p',
              devDependencies: { prettier: '^3.0.0', eslint: '^8.0.0' },
            }),
            'utf-8',
          );

          // Act
          const actual = await detectFormatter(projectRoot);

          // Assert
          expect(actual).toEqual({ formatter: 'eslint-prettier', formatterArgs: [] });
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      });
    });

    context('biome も prettier も不在の場合', () => {
      it('formatter を null にする', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-no-fmt-'));
        try {
          await writeFile(
            path.join(projectRoot, 'package.json'),
            JSON.stringify({ name: 'p', devDependencies: { typescript: '^5.0.0' } }),
            'utf-8',
          );

          // Act
          const actual = await detectFormatter(projectRoot);

          // Assert
          expect(actual).toEqual({ formatter: null, formatterArgs: [] });
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      });
    });
  });

  describe('hook-config.json 生成', () => {
    context('既存の hook-config.json がある場合', () => {
      it('ユーザーカスタマイズを尊重して上書きしない', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-custom-cfg-'));
        try {
          await mkdir(path.join(projectRoot, '.claude', 'scripts'), { recursive: true });
          const customContent = JSON.stringify(
            {
              targetDirs: ['custom/dir'],
              formatter: 'biome',
              formatterArgs: ['format'],
            },
            null,
            2,
          ) + '\n';
          await writeFile(
            path.join(projectRoot, '.claude', 'scripts', 'hook-config.json'),
            customContent,
            'utf-8',
          );

          // Act
          await runInitCli(projectRoot);

          // Assert
          const actual = await readFile(
            path.join(projectRoot, '.claude', 'scripts', 'hook-config.json'),
            'utf-8',
          );
          expect(actual).toBe(customContent);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);
    });

    context('hook-config.json が存在しない & pnpm モノレポの場合', () => {
      it('検出結果を反映した hook-config.json を生成する', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-gen-cfg-'));
        try {
          await writeFile(
            path.join(projectRoot, 'pnpm-workspace.yaml'),
            "packages:\n  - 'pkg/*'\n",
            'utf-8',
          );
          await writeFile(
            path.join(projectRoot, 'package.json'),
            JSON.stringify({ name: 'mono', devDependencies: { prettier: '^3.0.0' } }),
            'utf-8',
          );
          await mkdir(path.join(projectRoot, 'pkg', 'api', 'src'), { recursive: true });

          // Act
          const result = await runInitCli(projectRoot);

          // Assert
          expect(result.exitCode).toBe(0);
          const generated = JSON.parse(
            await readFile(path.join(projectRoot, '.claude', 'scripts', 'hook-config.json'), 'utf-8'),
          );
          expect(generated.targetDirs).toEqual(['pkg/api/src']);
          expect(generated.formatter).toBe('eslint-prettier');
          expect(generated.formatterArgs).toEqual([]);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);
    });
  });

  describe('schema v3 化', () => {
    context('phasegate init で生成される phasegate.config.json', () => {
      it('生成された config に architecture.preset: "clean" フィールドが含まれる', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-arch-'));
        try {
          // Act
          const result = await runInitCli(projectRoot);

          // Assert
          expect(result.exitCode).toBe(0);
          const config = JSON.parse(
            await readFile(path.join(projectRoot, 'phasegate.config.json'), 'utf-8'),
          );
          expect(config.architecture).toEqual({ preset: 'clean' });
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);

      it('init 直後の stderr に v2 schema warning が出ない', async () => {
        // Arrange
        const projectRoot = await mkdtemp(path.join(tmpdir(), 'init-novwarn-'));
        try {
          // Act
          const initResult = await runInitCli(projectRoot);
          // L1 の外部 Biome 起動を伴わない harness コマンドで config をロードさせる
          const actual = await new Promise<CliResult>((resolve, reject) => {
            const child = spawn(
              'node',
              ['--import', TSX_LOADER, MAIN_TS, 'validate', '--layer', 'L2'],
              { cwd: projectRoot, env: process.env },
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

          // Assert
          expect(initResult.exitCode).toBe(0);
          // v2 schema warning は config-foundation 内で "v2" 文字列を含むメッセージを出力する
          // architecture フィールドが含まれていれば v3 と判定されて warning が出ない想定
          expect(actual.stderr).not.toMatch(/v2.*schema|schema.*v2/i);
        } finally {
          await rm(projectRoot, { recursive: true, force: true });
        }
      }, 60000);
    });
  });
});
