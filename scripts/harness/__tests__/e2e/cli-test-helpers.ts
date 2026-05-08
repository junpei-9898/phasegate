/**
 * @layer e2e-test
 * @unit harness-api
 * @story H08-01
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const MAIN = resolve(ROOT, 'scripts/harness/main.ts');
const TSX_BIN = resolve(ROOT, 'node_modules/.bin/tsx');

export function run(...args: string[]) {
  return runInCwd(ROOT, ...args);
}

export function runInCwd(cwd: string, ...args: string[]) {
  const result = spawnSync(TSX_BIN, [MAIN, ...args], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 90_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
    exitCode: result.status ?? 2,
  };
}

export function withTempDir<T>(testFn: (cwd: string) => T): T {
  const cwd = mkdtempSync(join(tmpdir(), 'phasegate-cli-test-'));

  try {
    return testFn(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}
