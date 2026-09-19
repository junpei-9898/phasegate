// @unit agent-integration
// @layer infrastructure
// @work-item-id WI-203
// @story H11-04

import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';

const spawnMock = vi.hoisted(() => vi.fn());
const statMock = vi.hoisted(() => vi.fn());
vi.mock('node:fs', () => ({ statSync: statMock }));

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
  spawnSync: vi.fn(),
}));

import { ChildProcessCliExecutorAdapter } from '../../../agent-integration/infrastructure/adapters/child-process-cli-executor-adapter.js';

class MockChildProcess extends EventEmitter {
  readonly stdin = { end: vi.fn() };
  readonly stdout = new EventEmitter();
  readonly stderr = new EventEmitter();
  readonly kill = vi.fn();
}

function arrangeSpawnMock(): { child: MockChildProcess } {
  const child = new MockChildProcess();
  spawnMock.mockReturnValue(child);
  return { child };
}

async function executeCommand(input: {
  command: string;
  args: string[];
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}): Promise<{
  result: Awaited<ReturnType<ChildProcessCliExecutorAdapter['execute']>>;
  spawnCall: { cmd: unknown; args: unknown; options: unknown };
}> {
  const { child } = arrangeSpawnMock();
  const adapter = new ChildProcessCliExecutorAdapter();
  const pending = adapter.execute(input.command, input.args);
  if (input.stdout !== undefined) child.stdout.emit('data', Buffer.from(input.stdout));
  if (input.stderr !== undefined) child.stderr.emit('data', Buffer.from(input.stderr));
  child.emit('close', input.exitCode ?? 0);
  const result = await pending;
  const [cmd, args, options] = spawnMock.mock.calls[0] ?? [];
  return { result, spawnCall: { cmd, args, options } };
}

target('ChildProcessCliExecutorAdapter.execute', () => {
  it('package内にcompiled CLIがある場合はNodeで直接実行し、失敗も再試行せず返すこと', async () => {
    statMock.mockReturnValue({ isFile: () => true });
    const actual = await executeCommand({ command: 'phasegate:lint', args: ['--json'], exitCode: 2, stderr: 'compiled failure' });
    expect(actual.spawnCall.args).toEqual([expect.stringMatching(/scripts\/harness\/main\.js$/), 'phasegate:lint', '--json']);
    expect(actual.spawnCall.cmd).toBe(process.execPath);
    expect(actual.result).toEqual({ exitCode: 2, stdout: '', stderr: 'compiled failure', timedOut: false });
    expect(spawnMock).toHaveBeenCalledOnce();
  });

  it('compiled CLIがdirectoryの場合は従来TS入口を選ぶこと', async () => {
    statMock.mockReturnValue({ isFile: () => false });
    const actual = await executeCommand({ command: 'phasegate:lint', args: [] });
    expect(actual.spawnCall.args).toEqual([createRequire(import.meta.url).resolve('tsx/cli'), expect.stringMatching(/scripts\/harness\/main\.ts$/), 'phasegate:lint']);
  });
  it('シグナル終了を成功扱いにせず標準入力も閉じること', async () => {
    // Arrange
    const { child } = arrangeSpawnMock();
    const pending = new ChildProcessCliExecutorAdapter().execute('phasegate:lint', []);

    // Act
    child.emit('close', null, 'SIGTERM');
    const actual = await pending;

    // Assert
    expect(actual).toEqual({ exitCode: 1, stdout: '', stderr: '', timedOut: false });
    expect(child.stdin.end).toHaveBeenCalledOnce();
  });

  afterEach(() => {
    spawnMock.mockReset();
    statMock.mockReset();
  });

  describe('PhaseGate command を子プロセスで実行する', () => {
    context('canonical command が指定された場合', () => {
      it('project-local wrapper ではなく package 内の main CLI へ委譲すること', async () => {
        // Arrange
        const input = { command: 'phasegate:complete-check', args: [], stdout: 'ok' };

        // Act
        const actual = await executeCommand(input);

        // Assert
        expect(actual.result).toEqual({ exitCode: 0, stdout: 'ok', stderr: '', timedOut: false });
        expect(actual.spawnCall.cmd).toBe(process.execPath);
        expect(actual.spawnCall.args).toEqual([
          createRequire(import.meta.url).resolve('tsx/cli'),
          expect.stringMatching(/scripts\/harness\/main\.ts$/),
          'phasegate:complete-check',
        ]);
        expect(actual.spawnCall.args).not.toContain('scripts/harness/cli/complete-check.ts');
        expect(actual.spawnCall.options).toEqual({ stdio: ['pipe', 'pipe', 'pipe'], shell: false, detached: process.platform !== 'win32', cwd: undefined });
      });
    });

    context('legacy extension command が指定された場合', () => {
      it('既存互換の project-local wrapper 解決を維持すること', async () => {
        // Arrange
        const input = { command: 'custom-check', args: ['--flag'] };

        // Act
        const actual = await executeCommand(input);

        // Assert
        expect(actual.result).toEqual({ exitCode: 0, stdout: '', stderr: '', timedOut: false });
        expect(actual.spawnCall).toEqual({
          cmd: process.execPath,
          args: [createRequire(import.meta.url).resolve('tsx/cli'), 'scripts/harness/cli/custom-check.ts', '--flag'],
          options: { stdio: ['pipe', 'pipe', 'pipe'], shell: false, detached: process.platform !== 'win32', cwd: undefined },
        });
      });
    });
  });
});
