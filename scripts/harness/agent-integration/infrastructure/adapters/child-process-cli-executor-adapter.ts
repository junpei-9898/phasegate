/**
 * @layer infrastructure
 * @unit agent-integration
 *
 * ChildProcessCliExecutorAdapter
 * CliExecutorPort の実装。子プロセスで CLI コマンドを実行する
 */

import { spawn } from 'node:child_process';
import type { CliExecutorPort, CliExecutionResult } from '../ports/cli-executor-port.js';
import { TimeoutError } from '../ports/cli-executor-port.js';

/**
 * CommandName を実行可能なコマンドに変換する
 * 例: 'phasegate:lint' → ['npx', 'tsx', 'scripts/harness/cli/lint.ts']
 * テスト時は直接スクリプトパスで execute を呼ぶことも可能
 */
function resolveCommand(commandName: string): { cmd: string; args: string[] } {
  // コマンド名をファイルパスに変換
  const slug = commandName.replace('phasegate:', '');
  return {
    cmd: 'npx',
    args: ['tsx', `scripts/harness/cli/${slug}.ts`],
  };
}

export class ChildProcessCliExecutorAdapter implements CliExecutorPort {
  async execute(
    command: string,
    args: string[],
    timeoutMs?: number
  ): Promise<CliExecutionResult> {
    return new Promise((resolve, reject) => {
      let cmd: string;
      let spawnArgs: string[];

      // If the command looks like a file path (contains / or .ts), run it directly
      if (command.includes('/') || command.endsWith('.ts')) {
        cmd = 'npx';
        spawnArgs = ['tsx', command, ...args];
      } else {
        const resolved = resolveCommand(command);
        cmd = resolved.cmd;
        spawnArgs = [...resolved.args, ...args];
      }

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const child = spawn(cmd, spawnArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      });

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      let timer: NodeJS.Timeout | undefined;

      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
          reject(new TimeoutError(command, timeoutMs));
        }, timeoutMs);
      }

      child.on('close', (exitCode) => {
        if (timer) clearTimeout(timer);
        if (timedOut) return;

        resolve({
          exitCode: exitCode ?? 0,
          stdout,
          stderr,
          timedOut: false,
        });
      });

      child.on('error', (error) => {
        if (timer) clearTimeout(timer);
        reject(error);
      });
    });
  }
}
