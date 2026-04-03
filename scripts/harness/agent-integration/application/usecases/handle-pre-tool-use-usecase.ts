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
import type { BlockMetadata } from '../../domain/value-objects/hook-translation-result.js';
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
      const metadata = result.blockMetadata;
      const blockedFilePath = metadata?.blockedFilePath ?? input.targetFilePaths[0];

      if (metadata?.reason === 'PHASE_GATE') {
        return HandlePreToolUseUseCase.buildPhaseGateBlockOutput(blockedFilePath, metadata);
      }

      if (metadata?.reason === 'PROTECTED_FILE') {
        return HandlePreToolUseUseCase.buildProtectedFileBlockOutput(blockedFilePath);
      }

      return {
        shouldBlock: true,
        blockedFilePath,
        error: {
          message: `ブロックされました: ${blockedFilePath ?? '不明なファイル'}`,
        },
      };
    }

    return { shouldBlock: false };
  }

  private static readonly LEVEL_LABELS: Record<number, string> = {
    1: 'プロダクト設計',
    2: '構築設計',
    3: '実装',
  };

  private static buildPhaseGateBlockOutput(
    blockedFilePath: string | undefined,
    metadata: BlockMetadata,
  ): HandlePreToolUseOutput {
    const levelLabel = metadata.scopeLevel
      ? HandlePreToolUseUseCase.LEVEL_LABELS[metadata.scopeLevel] ?? `Level ${metadata.scopeLevel}`
      : '不明';
    const blockers = metadata.phaseGateBlockers ?? [];
    const lines: string[] = [
      `フェーズゲート違反: ${blockedFilePath ?? '不明なファイル'}`,
      `対象スコープ: Level ${metadata.scopeLevel ?? '?'} (${levelLabel})${metadata.unitId ? `, Unit: ${metadata.unitId}` : ''}`,
    ];

    if (blockers.length > 0) {
      lines.push('ブロック理由:');
      for (const b of blockers) {
        lines.push(`  - ${b}`);
      }
    }

    lines.push('次のアクション: /story-implementor スキルを使用して設計フェーズから開始してください。');
    if (metadata.unitId) {
      lines.push(`  実行例: /story-implementor --unit ${metadata.unitId}`);
    }

    return {
      shouldBlock: true,
      blockedFilePath,
      blockReason: 'PHASE_GATE',
      error: { message: lines.join('\n') },
      phaseGateBlockers: [...blockers],
      nextAction: metadata.unitId
        ? `/story-implementor --unit ${metadata.unitId}`
        : '/story-implementor',
    };
  }

  private static readonly PROTECTED_FILE_GUIDANCE: ReadonlyArray<{
    pattern: RegExp;
    message: (filePath: string) => string;
  }> = [
    {
      pattern: /(?:^|\/)package\.json$/,
      message: (fp) =>
        `保護ファイルへの書き込みがブロックされました: ${fp}\nバージョン変更を含む package.json の更新は /quick-implementor スキルを使用してください。`,
    },
    {
      pattern: /(?:^|\/)harness\.config\.json$/,
      message: (fp) =>
        `保護ファイルへの書き込みがブロックされました: ${fp}\nハーネス設定は CLI 経由で変更してください: npx phasegate config ...`,
    },
    {
      pattern: /(?:^|\/)\.claude\/settings\.json$/,
      message: (fp) =>
        `保護ファイルへの書き込みがブロックされました: ${fp}\nClaude Code の設定変更は /update-config スキルを使用してください。`,
    },
    {
      pattern: /(?:^|\/)docs\/principles\//,
      message: (fp) =>
        `保護ファイルへの書き込みがブロックされました: ${fp}\n原則ドキュメントは immutable です。変更はできません。`,
    },
  ];

  private static buildProtectedFileBlockOutput(
    blockedFilePath: string | undefined,
  ): HandlePreToolUseOutput {
    const fp = blockedFilePath ?? '不明なファイル';
    const matched = HandlePreToolUseUseCase.PROTECTED_FILE_GUIDANCE.find(
      ({ pattern }) => pattern.test(fp),
    );
    const message = matched
      ? matched.message(fp)
      : `保護ファイルへの書き込みがブロックされました: ${fp}\nこのファイルは保護されています。/quick-implementor スキルで変更可能か確認してください。`;

    return {
      shouldBlock: true,
      blockedFilePath,
      blockReason: 'PROTECTED_FILE',
      error: { message },
    };
  }
}
