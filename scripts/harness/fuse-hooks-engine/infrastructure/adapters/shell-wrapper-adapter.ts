/**
 * @layer infrastructure
 * @unit fuse-hooks-engine
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { FuseHooksEngineDomainError } from '../../domain/errors/fuse-hooks-engine-domain-error.js';
import { DestructiveCommandList } from '../../domain/value-objects/destructive-command-list.js';

const execAsync = promisify(exec);

export class ShellWrapperAdapter {
  private readonly destructiveCommandList = DestructiveCommandList.create([
    { command: 'rm', dangerousOptions: ['-rf', '-fr'] },
    { command: 'git', dangerousOptions: ['reset --hard'] },
  ])._unsafeUnwrap();

  async execute(script: string, options: { timeout?: number; failOnNonZero: boolean }) {
    if (this.destructiveCommandList.isDestructive(script)) {
      throw new FuseHooksEngineDomainError(
        'DESTRUCTIVE_COMMAND_BLOCKED',
        'Destructive command blocked',
      );
    }

    try {
      const result = await execAsync(script, {
        timeout: options.timeout,
        shell: '/bin/zsh',
      });
      return {
        exitCode: 0,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string; code?: number };
      if (options.failOnNonZero) {
        throw new FuseHooksEngineDomainError(
          'SHELL_HOOK_FAILED',
          failure.stderr ?? 'Shell hook failed',
        );
      }
      return {
        exitCode: typeof failure.code === 'number' ? failure.code : 1,
        stdout: failure.stdout ?? '',
        stderr: failure.stderr ?? '',
      };
    }
  }
}
