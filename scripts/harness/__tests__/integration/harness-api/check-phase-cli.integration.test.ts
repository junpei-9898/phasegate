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

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', MAIN_TS, ...args], { env: process.env });
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

target('phasegate:check-phase CLI 引数パース (ISSUE-005 P2-6)', () => {
  context('--help フラグ付きで実行した場合', () => {
    it('Usage 表示されて exit 0 で終了する', async () => {
      // Arrange / Act
      const actual = await runCli(['phasegate:check-phase', '--help']);
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('Usage: phasegate phasegate:check-phase');
      expect(actual.stdout).toContain('--unit <unitId>');
    }, 60000);
  });

  context('--json フラグ付きで実行した場合', () => {
    it('unitId=--json として処理されない (positional に --json が食われない)', async () => {
      // Arrange / Act
      const actual = await runCli(['phasegate:check-phase', '--json']);
      // Assert: unit 未指定扱いの JSON エラー応答であること
      expect(actual.stdout).not.toContain('"unitId":"--json"');
      expect(actual.stdout).not.toContain('"unit":"--json"');
    }, 60000);
  });
});
