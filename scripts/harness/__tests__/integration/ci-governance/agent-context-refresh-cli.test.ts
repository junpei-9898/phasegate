// @unit ci-governance
// @layer integration
// @work-item-id WI-032
// @story H13-03

import { spawn } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';

const HARNESS_ROOT = resolve(process.cwd());
const MAIN_TS = join(HARNESS_ROOT, 'scripts/harness/main.ts');

interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function runCli(args: string[], cwd: string): Promise<CliResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawn('npx', ['tsx', MAIN_TS, ...args], { cwd });
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
      resolveResult({ exitCode: code ?? -1, stdout, stderr });
    });
    child.stdin.end();
  });
}

async function withTempProject<T>(testFn: (projectRoot: string) => Promise<T>): Promise<T> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'phasegate-agent-context-cli-'));
  try {
    return await testFn(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

target('agent context refresh CLI', () => {
  describe('CLI から agent context を操作する', () => {
    context('dry-run で実行する場合', () => {
      it('JSON preview が返ること', async () => {
        // Arrange / Act
        const actual = await withTempProject(async (projectRoot) => {
          return await runCli(['ci:auto-refresh-agent-context', '--dry-run', '--json'], projectRoot);
        });

        // Assert
        const parsed = JSON.parse(actual.stdout);
        expect(actual.exitCode).toBe(0);
        expect(parsed.applied).toBe(false);
      }, 120000);
    });

    context('init --with-ci を実行する場合', () => {
      it('agent-context-refresh workflow が配置されること', async () => {
        // Arrange / Act
        const actual = await withTempProject(async (projectRoot) => {
          const result = await runCli(['init', '--name', 'foo', '--skills', 'core', '--agent', 'codex', '--with-ci', '--yes'], projectRoot);
          await access(join(projectRoot, '.github/workflows/agent-context-refresh.yml'));
          return result;
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).not.toContain('unknown flag');
      }, 120000);
    });
  });
});
