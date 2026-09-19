/**
 * @layer infrastructure
 * @unit agent-integration
 * @work-item-id WI-203
 *
 * ChildProcessCliExecutorAdapter
 * CliExecutorPort の実装。子プロセスで CLI コマンドを実行する
 */

import { spawn, spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CliExecutorPort, CliExecutionResult } from '../../application/ports/cli-executor-port.js';
import { TimeoutError } from '../../application/ports/cli-executor-port.js';

const tsxCliPath = createRequire(import.meta.url).resolve('tsx/cli');

function getHarnessMainPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../main.ts');
}

/**
 * CommandName を実行可能なコマンドに変換する
 * 例: 'phasegate:lint' → [node, '<package>/tsx/cli', '<package>/scripts/harness/main.ts', 'phasegate:lint']
 * テスト時は直接スクリプトパスで execute を呼ぶことも可能
 */
function resolveCommand(commandName: string): { cmd: string; args: string[] } {
  if (commandName.startsWith('phasegate:')) {
    const compiledMain = resolve(dirname(getHarnessMainPath()), 'main.js');
    let compiled = false;
    try { compiled = statSync(compiledMain).isFile(); } catch { /* Source-only packages retain the TS entry. */ }
    return {
      cmd: process.execPath,
      args: compiled ? [compiledMain, commandName] : [tsxCliPath, getHarnessMainPath(), commandName],
    };
  }

  // Legacy extension commands may still be provided as project-local wrappers.
  const slug = commandName.replace('phasegate:', '');
  return {
    cmd: process.execPath,
    args: [tsxCliPath, `scripts/harness/cli/${slug}.ts`],
  };
}

export class ChildProcessCliExecutorAdapter implements CliExecutorPort {
  constructor(private readonly options: { cwd?: string } = {}) {}

  async execute(
    command: string,
    args: string[],
    timeoutMs?: number
  ): Promise<CliExecutionResult> {
    return new Promise((resolve, reject) => {
      let cmd: string;
      let spawnArgs: string[];

      // If the command looks like a file path (contains / or .ts), run it directly
      if (command.includes('/') || command.includes('\\') || command.endsWith('.ts')) {
        cmd = process.execPath;
        spawnArgs = [tsxCliPath, command, ...args];
      } else {
        const resolved = resolveCommand(command);
        cmd = resolved.cmd;
        spawnArgs = [...resolved.args, ...args];
      }

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let closed = false;
      let cleanupDone = false;

      const child = spawn(cmd, spawnArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        cwd: this.options.cwd,
        detached: process.platform !== 'win32',
      });
      child.stdin?.end();

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      let timer: NodeJS.Timeout | undefined;
      let killTimer: NodeJS.Timeout | undefined;
      const finishTimeout = () => {
        if (closed && cleanupDone) reject(new TimeoutError(command, timeoutMs!));
      };
      const signalTree = (signal: NodeJS.Signals) => {
        if (child.pid === undefined) return;
        try {
          process.kill(-child.pid, signal);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
      };

      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          timedOut = true;
          try {
            if (process.platform === 'win32' && child.pid !== undefined) {
              const cleanup = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: false, timeout: 5000 });
              if (cleanup.error || cleanup.status !== 0) throw cleanup.error ?? new Error(`Process tree cleanup failed: ${cleanup.status}`);
              cleanupDone = true;
              finishTimeout();
            } else {
              signalTree('SIGTERM');
              // Keep the group cleanup even if its leader closes before descendants.
              killTimer = setTimeout(() => {
                try {
                  signalTree('SIGKILL');
                  cleanupDone = true;
                  finishTimeout();
                } catch (error) {
                  reject(error);
                }
              }, 250);
            }
          } catch (error) {
            reject(error);
          }
        }, timeoutMs);
      }

      child.on('close', (exitCode) => {
        closed = true;
        if (timer) clearTimeout(timer);
        if (timedOut) {
          finishTimeout();
          return;
        }

        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr,
          timedOut: false,
        });
      });

      child.on('error', (error) => {
        if (timer) clearTimeout(timer);
        if (killTimer) clearTimeout(killTimer);
        reject(error);
      });
    });
  }
}
