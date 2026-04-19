// @unit harness-api
// @layer integration
// @story H03-02

import { spawn, execSync } from 'node:child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, '../../../../..');
const MAIN_TS = path.join(HARNESS_ROOT, 'scripts/harness/main.ts');

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', MAIN_TS, ...args], {
      cwd,
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
    child.stdin.end();
  });
}

target('pre-commit CLI 統合検証 (ISSUE-005 P0-1)', () => {
  context('pre-commit サブコマンドの起動', () => {
    it('モジュール解決に失敗せず起動できること (Cannot find module 回帰防止)', async () => {
      // Arrange: staged files が無い一時 git ワークツリーを作成
      const workDir = await mkdtemp(path.join(tmpdir(), 'phasegate-pc-'));
      try {
        // Act
        const actual = await runCli(['pre-commit'], workDir);
        // Assert: モジュール解決エラーが出ないこと
        expect(actual.stderr).not.toContain('Cannot find module');
        expect(actual.stderr).not.toContain('core/config-loader');
        expect(actual.stderr).not.toContain('core/metadata-parser');
        expect(actual.stderr).not.toContain('core/error-reporter');
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);

    it('staged ファイルが無い場合は exit 0 で終了すること', async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), 'phasegate-pc-'));
      try {
        // Act — git 管理外ディレクトリで実行 → staged files は空
        const actual = await runCli(['pre-commit'], workDir);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('No staged files to check');
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });

  context('staged に .md が含まれる場合 (ISSUE-008 Phase B-3)', () => {
    // IT-PC-09
    it('.md のみ staged な場合、pre-commit は .ts 欠落でスキップせず .md を検査する', async () => {
      // Arrange — 一時 git ワークツリーを作成し .md を staged 済みにする
      const workDir = await mkdtemp(path.join(tmpdir(), 'phasegate-pc-md-'));
      try {
        execSync('git init -q', { cwd: workDir });
        execSync('git config user.email test@example.com', { cwd: workDir });
        execSync('git config user.name Test', { cwd: workDir });
        const mdDir = path.join(workDir, 'docs/product/construction/foo');
        await mkdir(mdDir, { recursive: true });
        await writeFile(
          path.join(mdDir, 'logical_design.md'),
          '# foo\n\nbody\n',
        );
        execSync('git add docs/product/construction/foo/logical_design.md', {
          cwd: workDir,
        });
        // Act
        const actual = await runCli(['pre-commit'], workDir);
        // Assert — 旧メッセージの回帰防止
        expect(actual.stdout).not.toContain('No staged files to check');
        expect(actual.stdout).toContain('設計文書');
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }, 60000);
  });
});
