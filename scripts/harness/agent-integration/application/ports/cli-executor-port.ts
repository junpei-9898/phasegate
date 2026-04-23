/**
 * @layer application
 * @unit agent-integration
 *
 * CliExecutorPort — application層ポート（Adapter は infrastructure/adapters/ で実装）
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
