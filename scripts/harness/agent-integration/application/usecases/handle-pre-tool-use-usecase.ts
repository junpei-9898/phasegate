/**
 * @layer application
 * @unit agent-integration
 * @story H11-02
 *
 * HandlePreToolUseUseCase
 * PreToolUse Hook処理のオーケストレーション
 */

import { AsyncHookToCliTranslator } from '../../domain/services/hook-to-cli-translator.js';
import { HookEvent } from '../../domain/value-objects/hook-event.js';
import { ProtectedFileList } from '../../domain/value-objects/protected-file-list.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { PhaseGateQueryPort } from '../../domain/ports/phase-gate-query-port.js';
import type { HandlePreToolUseInput, HandlePreToolUseOutput } from '../dto/handle-pre-tool-use-dto.js';

export interface HandlePreToolUseUseCasePorts {
  configQueryPort: ConfigQueryPort;
  phaseGateQueryPort: PhaseGateQueryPort;
}

export class HandlePreToolUseInputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandlePreToolUseInputValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class HandlePreToolUseUseCase {
  private readonly translator: AsyncHookToCliTranslator;
  private readonly configQueryPort: ConfigQueryPort;

  constructor(ports: HandlePreToolUseUseCasePorts) {
    this.configQueryPort = ports.configQueryPort;
    this.translator = new AsyncHookToCliTranslator({
      configQueryPort: ports.configQueryPort,
      reentryGuard: { isActive: () => false } as never,
      cliCommandRegistryPort: { hasCommand: async () => true },
      phaseGateQueryPort: ports.phaseGateQueryPort,
    });
  }

  async execute(input: HandlePreToolUseInput): Promise<HandlePreToolUseOutput> {
    if (!input.toolName || input.toolName.trim() === '') {
      throw new HandlePreToolUseInputValidationError('toolNameは必須です（空文字不可）');
    }

    const hookEvent = HookEvent.createPreToolUse(input.toolName, input.targetFilePaths);
    const result = await this.translator.translate(hookEvent);

    if (result.shouldBlock) {
      const additionalPatterns = await this.configQueryPort.getProtectedFilePatterns();
      const protectedFileList = ProtectedFileList.createWithAdditional(additionalPatterns);
      const blockedFilePath = input.targetFilePaths.find((filePath) => protectedFileList.matches(filePath))
        ?? input.targetFilePaths[0];

      return {
        shouldBlock: true,
        blockedFilePath,
        error: {
          message: blockedFilePath === undefined
            ? '保護対象ファイルまたはフェーズゲート違反によりブロックされました'
            : `保護対象ファイルまたはフェーズゲート違反によりブロックされました: ${blockedFilePath}`,
        },
      };
    }

    return { shouldBlock: false };
  }
}
