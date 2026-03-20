/**
 * @layer infrastructure
 * @unit agent-integration
 *
 * CliExecutorPort — infrastructure層ローカルポート
 */

export interface CliExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export class TimeoutError extends Error {
  constructor(commandName: string, timeoutMs: number) {
    super(`コマンド実行がタイムアウトしました: ${commandName} (${timeoutMs}ms)`);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface CliExecutorPort {
  execute(
    command: string,
    args: string[],
    timeoutMs?: number
  ): Promise<CliExecutionResult>;
}
