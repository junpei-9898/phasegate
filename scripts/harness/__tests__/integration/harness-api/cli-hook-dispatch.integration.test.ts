// @unit harness-api
// @layer integration

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';

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
      expect(actual.stdout).toContain('hook <pre-tool-use|post-tool-use|stop>');
      expect(actual.stdout).toContain('pre-commit');
      expect(actual.stdout).toContain('delegate-sonnet');
    }, 30000);
  });
});
