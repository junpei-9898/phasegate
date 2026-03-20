/**
 * @layer application
 * @unit agent-integration
 * @story H11-02
 *
 * HandlePreToolUseUseCase
 * PreToolUse Hook処理のオーケストレーション
 */

import { HookEvent } from '../../domain/value-objects/hook-event.js';
import { ProtectedFileList } from '../../domain/value-objects/protected-file-list.js';
import { AsyncHookToCliTranslator } from '../../domain/services/hook-to-cli-translator.js';
import { ReentryGuard } from '../../domain/entities/reentry-guard.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { HandlePreToolUseInput, HandlePreToolUseOutput } from '../dto/handle-pre-tool-use-dto.js';

export interface HandlePreToolUseUseCasePorts {
  configQueryPort: ConfigQueryPort;
}

export class HandlePreToolUseInputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandlePreToolUseInputValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class HandlePreToolUseUseCase {
  private readonly configQueryPort: ConfigQueryPort;

  constructor(ports: HandlePreToolUseUseCasePorts) {
    this.configQueryPort = ports.configQueryPort;
  }

  async execute(input: HandlePreToolUseInput): Promise<HandlePreToolUseOutput> {
    if (!input.toolName || input.toolName.trim() === '') {
      throw new HandlePreToolUseInputValidationError('toolNameは必須です（空文字不可）');
    }

    const additionalPatterns = await this.configQueryPort.getProtectedFilePatterns();
    const protectedFileList = ProtectedFileList.createWithAdditional(additionalPatterns);

    const blockedPath = input.targetFilePaths.find((fp) => protectedFileList.matches(fp));

    if (blockedPath !== undefined) {
      return {
        shouldBlock: true,
        blockedFilePath: blockedPath,
        error: { message: `保護対象ファイルへの変更がブロックされました: ${blockedPath}` },
      };
    }

    return {
      shouldBlock: false,
      blockedFilePath: undefined,
    };
  }
}
