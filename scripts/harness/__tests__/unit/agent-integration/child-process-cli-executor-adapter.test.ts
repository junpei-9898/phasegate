// @unit agent-integration
// @layer infrastructure
// @work-item-id WI-203
// @story H11-04

import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

import { ChildProcessCliExecutorAdapter } from '../../../agent-integration/infrastructure/adapters/child-process-cli-executor-adapter.js';

class MockChildProcess extends EventEmitter {
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
  afterEach(() => {
    spawnMock.mockReset();
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
        expect(actual.spawnCall.cmd).toBe('npx');
        expect(actual.spawnCall.args).toEqual([
          'tsx',
          expect.stringMatching(/scripts\/harness\/main\.ts$/),
          'phasegate:complete-check',
        ]);
        expect(actual.spawnCall.args).not.toContain('scripts/harness/cli/complete-check.ts');
        expect(actual.spawnCall.options).toEqual({ stdio: ['pipe', 'pipe', 'pipe'], shell: false });
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
          cmd: 'npx',
          args: ['tsx', 'scripts/harness/cli/custom-check.ts', '--flag'],
          options: { stdio: ['pipe', 'pipe', 'pipe'], shell: false },
        });
      });
    });
  });
});
