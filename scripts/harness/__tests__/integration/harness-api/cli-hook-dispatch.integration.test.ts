// @unit harness-api
// @layer integration
// @story H08-01
// @work-item-id WI-204
// @work-item-id WI-347

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, '../../../../..');
const MAIN_TS = path.join(HARNESS_ROOT, 'scripts/harness/main.ts');
const TSX_IMPORT = createRequire(import.meta.url).resolve('tsx');

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], stdin?: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(execPath, ['--import', TSX_IMPORT, MAIN_TS, ...args], {
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

target('CLI hook dispatch (ISSUE-004 Phase B)', () => {
  describe('phasegate hook サブコマンドの解決', () => {
    it('hook サブコマンド指定なしの場合、Usageを出してexit 2で終了すること', async () => {
      // Arrange
      const args = ['hook'];
      // Act
      const actual = await runCli(args);
      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain('Usage: phasegate hook');
    }, 30000);

    it('hook の未知のサブコマンドを指定した場合、エラーを出してexit 2で終了すること', async () => {
      // Arrange
      const args = ['hook', 'unknown-subcommand'];
      // Act
      const actual = await runCli(args);
      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain('Unknown hook subcommand: unknown-subcommand');
    }, 30000);

    context('hook pre-tool-use に Read tool の JSON を渡した場合', () => {
      it('Read は phase gate 対象外のためexit 0で終了すること', async () => {
        // Arrange
        const args = ['hook', 'pre-tool-use'];
        const stdin = JSON.stringify({
          cwd: HARNESS_ROOT,
          tool_name: 'Read',
          tool_input: { file_path: '/tmp/dummy.md' },
        });
        // Act
        const actual = await runCli(args, stdin);
        // Assert: dispatch reached pre-tool-use-hook (would have exit 2 if "Unknown command")
        expect(actual.exitCode).toBe(0);
      }, 30000);
    });

    context('hook pre-tool-use に異常な tool_input の JSON を渡した場合', () => {
      it('tool_input が null の場合は対象変更なしとしてexit 0で終了すること', async () => {
        // Arrange
        const args = ['hook', 'pre-tool-use'];
        const stdin = JSON.stringify({
          cwd: HARNESS_ROOT,
          tool_name: 'Read',
          tool_input: null,
        });

        // Act
        const actual = await runCli(args, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).not.toContain('予期しないエラー');
        expect(actual.stderr).not.toContain('TypeError');
      }, 60000);

      it('tool_input が文字列の場合は対象変更なしとしてexit 0で終了すること', async () => {
        // Arrange
        const args = ['hook', 'pre-tool-use'];
        const stdin = JSON.stringify({
          cwd: HARNESS_ROOT,
          tool_name: 'Read',
          tool_input: 'invalid-input',
        });

        // Act
        const actual = await runCli(args, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).not.toContain('予期しないエラー');
        expect(actual.stderr).not.toContain('TypeError');
      }, 60000);
    });

    context('hook pre-tool-use に CWD 外 runtime path の JSON を渡した場合', () => {
      it('project 外 absolute path は project policy 対象外としてexit 0で終了すること', async () => {
        // Arrange
        const projectRoot = mkdtempSync(path.join(tmpdir(), 'phasegate-external-hook-'));
        const configWriteResult = writeFileSync(path.join(projectRoot, 'phasegate.config.json'), `${JSON.stringify({
          project: { name: 'external-hook', preset: 'standard' },
          architecture: { preset: 'clean' },
          layers: {},
          quickMode: { allowedCategories: ['bugfix'], relaxedGates: [] },
          phaseDependencies: { preset: 'default', override: false, customRules: [] },
          planningMode: { default: 'interactive', perPhase: {} },
          harnesses: {},
          paths: {
            designDocs: 'docs/product/construction',
            inceptionDocs: 'docs/inception',
          },
          reporting: { format: 'json', outputDir: 'reports' },
        }, null, 2)}\n`, 'utf8');
        void configWriteResult;
        const args = ['hook', 'pre-tool-use'];
        const stdin = JSON.stringify({
          cwd: projectRoot,
          tool_name: 'Write',
          tool_input: {
            file_path: path.join(tmpdir(), 'phasegate-external-memory.md'),
            content: 'memory\n',
          },
        });

        // Act
        const actual = await runCli(args, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).not.toContain('Full mode 必須変更が検出されました');
      }, 30000);

      it('project 外へ解決される相対パスは project policy 対象外としてexit 0で終了すること', async () => {
        // Arrange
        const projectRoot = mkdtempSync(path.join(tmpdir(), 'phasegate-relative-external-hook-'));
        const nestedCwd = path.join(projectRoot, 'workspace', 'nested');
        const externalRoot = mkdtempSync(path.join(tmpdir(), 'phasegate-relative-external-target-'));
        mkdirSync(nestedCwd, { recursive: true });
        writeFileSync(path.join(projectRoot, 'phasegate.config.json'), `${JSON.stringify({
          project: { name: 'relative-external-hook', preset: 'standard' },
          architecture: { preset: 'clean' },
          layers: {},
          quickMode: {
            allowedCategories: ['docs'],
            maintainedLayers: ['L1'],
            relaxedGates: [],
          },
          phaseDependencies: { preset: 'default', override: false, customRules: [] },
          planningMode: { default: 'interactive', perPhase: {} },
          harnesses: {},
          baseline: { enabled: false },
          paths: {
            designDocs: 'docs/product/construction',
            inceptionDocs: 'docs/inception',
          },
          reporting: { format: 'json', outputDir: 'reports' },
        }, null, 2)}\n`, 'utf8');
        const args = ['hook', 'pre-tool-use'];
        const stdin = JSON.stringify({
          cwd: nestedCwd,
          tool_name: 'Write',
          tool_input: {
            file_path: path.relative(nestedCwd, path.join(externalRoot, 'x.ts')),
            content: 'export const external = true;\n',
          },
        });

        // Act
        const actual = await runCli(args, stdin);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).not.toContain('Full mode 必須変更が検出されました');
      }, 60000);
    });

    context('hook pre-tool-use に project 内の相対パスを渡した場合', () => {
      it('project 内へ解決される通常相対パスは従来どおりゲート対象としてブロックすること', async () => {
        // Arrange
        const projectRoot = mkdtempSync(path.join(tmpdir(), 'phasegate-relative-internal-hook-'));
        writeFileSync(path.join(projectRoot, 'phasegate.config.json'), `${JSON.stringify({
          project: { name: 'relative-internal-hook', preset: 'standard' },
          architecture: { preset: 'clean' },
          layers: {},
          quickMode: {
            allowedCategories: ['docs'],
            maintainedLayers: ['L1'],
            relaxedGates: [],
          },
          phaseDependencies: { preset: 'default', override: false, customRules: [] },
          planningMode: { default: 'interactive', perPhase: {} },
          harnesses: {},
          baseline: { enabled: false },
          paths: {
            designDocs: 'docs/product/construction',
            inceptionDocs: 'docs/inception',
          },
          reporting: { format: 'json', outputDir: 'reports' },
        }, null, 2)}\n`, 'utf8');
        const args = ['hook', 'pre-tool-use'];
        const stdin = JSON.stringify({
          cwd: projectRoot,
          tool_name: 'Write',
          tool_input: {
            file_path: 'misc/new-source.ts',
            content: 'export const internal = true;\n',
          },
        });

        // Act
        const actual = await runCli(args, stdin);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toContain('Full mode 必須変更が検出されました');
      }, 60000);
    });
  });

  describe('phasegate delegate-sonnet サブコマンドの解決', () => {
    it('delegate-sonnet --dry-run で DRY RUN ヘッダーを出してexit 0で終了すること', async () => {
      // Arrange
      const args = ['delegate-sonnet', '--dry-run', '--prompt', 'integration-test', '--output', '/tmp/cli-dispatch-it-output.md'];
      // Act
      const actual = await runCli(args);
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('=== DRY RUN ===');
      expect(actual.stdout).toContain('integration-test');
      expect(actual.stdout).toContain('/tmp/cli-dispatch-it-output.md');
    }, 30000);
  });

  describe('phasegate --help の出力', () => {
    it('新規サブコマンド（hook / pre-commit / delegate-sonnet）が usage に含まれること', async () => {
      // Arrange
      const args = ['--help'];
      // Act
      const actual = await runCli(args);
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('hook <pre-tool-use|post-tool-use|stop|session-start|user-prompt-submit>');
      expect(actual.stdout).toContain('pre-commit');
      expect(actual.stdout).toContain('delegate-sonnet');
    }, 30000);
  });
});
