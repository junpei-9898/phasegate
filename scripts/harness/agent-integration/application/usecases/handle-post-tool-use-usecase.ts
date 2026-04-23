/**
 * @layer application
 * @unit agent-integration
 * @story H11-03
 *
 * HandlePostToolUseUseCase
 * PostToolUse Hook処理のオーケストレーション
 */

import { HookEvent } from '../../domain/value-objects/hook-event.js';
import { ReentryGuard } from '../../domain/entities/reentry-guard.js';
import { AsyncHookToCliTranslator } from '../../domain/services/hook-to-cli-translator.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { CliExecutorPort, CliExecutionResult } from '../ports/cli-executor-port.js';
import { TimeoutError } from '../ports/cli-executor-port.js';
import type { HandlePostToolUseInput, HandlePostToolUseOutput } from '../dto/handle-post-tool-use-dto.js';

export interface HandlePostToolUseUseCasePorts {
  configQueryPort: ConfigQueryPort;
  cliExecutorPort: CliExecutorPort;
  cliCommandRegistryPort: {
    hasCommand(commandName: string): Promise<boolean>;
    listCommands(): Promise<readonly string[]>;
  };
}

export class HandlePostToolUseUseCase {
  private readonly translator: AsyncHookToCliTranslator;
  private readonly cliExecutorPort: CliExecutorPort;

  constructor(ports: HandlePostToolUseUseCasePorts) {
    const reentryGuard = new ReentryGuard();
    this.translator = new AsyncHookToCliTranslator({
      configQueryPort: ports.configQueryPort,
      reentryGuard,
      cliCommandRegistryPort: ports.cliCommandRegistryPort,
    });
    this.cliExecutorPort = ports.cliExecutorPort;
  }

  async execute(input: HandlePostToolUseInput): Promise<HandlePostToolUseOutput> {
    const hookEvent = HookEvent.createPostToolUse(input.toolName, input.affectedFilePaths);
    const translationResult = await this.translator.translate(hookEvent);

    if (translationResult.shouldSkip()) {
      return {
        executed: false,
        skipReason: translationResult.skipReason,
      };
    }

    try {
      const cliResult = await this.cliExecutorPort.execute(
        translationResult.cliCommand!,
        [...translationResult.cliArgs],
        translationResult.timeoutMs
      );
      return {
        executed: true,
        cliResult,
      };
    } catch (error) {
      if (error instanceof TimeoutError) {
        return {
          executed: false,
          skipReason: 'TIMEOUT_EXCEEDED',
        };
      }
      throw error;
    }
  }
}
