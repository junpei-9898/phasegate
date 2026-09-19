/**
 * @layer application
 * @unit agent-integration
 * @story H11-04
 * @work-item-id WI-220
 *
 * HandleStopUseCase
 * Stop Hook処理のオーケストレーション。ReentryGuardライフサイクル管理の唯一の制御点
 */

import type { ReentryGuardStatePort } from '../../domain/ports/reentry-guard-state-port.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { CliExecutorPort } from '../ports/cli-executor-port.js';
import type { HandleStopInput, HandleStopOutput } from '../dto/handle-stop-dto.js';

export interface HandleStopUseCasePorts {
  reentryGuardStatePort: ReentryGuardStatePort;
  cliExecutorPort: CliExecutorPort;
  configQueryPort: ConfigQueryPort;
  /** Legacy constructor input; Stop dispatches complete-check directly. */
  cliCommandRegistryPort?: {
    hasCommand(commandName: string): Promise<boolean>;
    listCommands(): Promise<readonly string[]>;
  };
}

export class HandleStopInputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandleStopInputValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class HandleStopUseCase {
  private readonly reentryGuardStatePort: ReentryGuardStatePort;
  private readonly cliExecutorPort: CliExecutorPort;
  private readonly configQueryPort: ConfigQueryPort;

  constructor(ports: HandleStopUseCasePorts) {
    this.reentryGuardStatePort = ports.reentryGuardStatePort;
    this.cliExecutorPort = ports.cliExecutorPort;
    this.configQueryPort = ports.configQueryPort;
  }

  async execute(input: HandleStopInput): Promise<HandleStopOutput> {
    if (!input.sessionId || input.sessionId.trim() === '') {
      throw new HandleStopInputValidationError('sessionIdは必須です（空文字不可）');
    }

    // Read state via port
    const isActive = await this.reentryGuardStatePort.readActive();

    if (isActive) {
      return {
        executed: false,
        skipReason: 'REENTRY_DETECTED',
      };
    }

    // Activate
    await this.reentryGuardStatePort.writeActive();

    try {
      const cliResult = await this.cliExecutorPort.execute('phasegate:complete-check', []);
      // WI-087 finding #4: enforce=true かつ Complete Check 失敗時のみ shouldEnforceFailure=true
      const enforce = await this.configQueryPort.getStopHookEnforce();
      const shouldEnforceFailure = enforce && cliResult.exitCode !== 0;
      return {
        executed: true,
        cliResult,
        shouldEnforceFailure,
      };
    } finally {
      // deactivate は成否問わず必ず実行（finally保証）
      await this.reentryGuardStatePort.clearActive();
    }
  }
}
