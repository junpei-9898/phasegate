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
import type { BlockMetadata } from '../../domain/value-objects/hook-translation-result.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { PhaseGateQueryPort } from '../../domain/ports/phase-gate-query-port.js';
import type { StoryReflectionQueryPort } from '../../domain/ports/story-reflection-query-port.js';
import { WriteTargetScope } from '../../domain/value-objects/write-target-scope.js';
import type { HandlePreToolUseInput, HandlePreToolUseOutput } from '../dto/handle-pre-tool-use-dto.js';

export interface HandlePreToolUseUseCasePorts {
  configQueryPort: ConfigQueryPort;
  phaseGateQueryPort: PhaseGateQueryPort;
  storyReflectionQueryPort?: StoryReflectionQueryPort;
}

export class HandlePreToolUseInputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandlePreToolUseInputValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class HandlePreToolUseUseCase {
  private static readonly WRITE_TOOLS: ReadonlySet<string> = new Set([
    'Write', 'Edit', 'NotebookEdit', 'str_replace_editor',
  ]);

  private readonly translator: AsyncHookToCliTranslator;
  private readonly configQueryPort: ConfigQueryPort;
  private readonly storyReflectionQueryPort?: StoryReflectionQueryPort;

  constructor(ports: HandlePreToolUseUseCasePorts) {
    this.configQueryPort = ports.configQueryPort;
    this.storyReflectionQueryPort = ports.storyReflectionQueryPort;
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

    const scope = this.resolveStoryReflectionScope(input);
    if (scope === null || this.storyReflectionQueryPort === undefined) {
      return { shouldBlock: false };
    }

    const reflectionResult = await this.storyReflectionQueryPort.checkReflection(scope.unitId);

    if (reflectionResult.skipped || reflectionResult.passed) {
      return { shouldBlock: false };
    }

    return HandlePreToolUseUseCase.buildStoryReflectionBlockOutput(
      input.targetFilePaths[0],
      reflectionResult.blockers,
      reflectionResult.warnings,
    );
  }

  private resolveStoryReflectionScope(input: HandlePreToolUseInput): WriteTargetScope | null {
    if (!HandlePreToolUseUseCase.WRITE_TOOLS.has(input.toolName)) {
      return null;
    }

    const projectPaths = this.configQueryPort.getProjectPaths();

    for (const targetFilePath of input.targetFilePaths) {
      const scope = WriteTargetScope.fromPath(targetFilePath, projectPaths);
      if (scope?.level === 3 && scope.unitId !== undefined) {
        return scope;
      }
    }

    return null;
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

  private static buildStoryReflectionBlockOutput(
    blockedFilePath: string | undefined,
    blockers: readonly string[],
    warnings: readonly string[],
  ): HandlePreToolUseOutput {
    return {
      shouldBlock: true,
      blockedFilePath,
      blockReason: 'STORY_REFLECTION',
      error: {
        message: HandlePreToolUseUseCase.buildStoryReflectionErrorMessage(blockers),
      },
      storyReflectionBlockers: [...blockers],
      storyReflectionWarnings: [...warnings],
    };
  }

  private static buildStoryReflectionErrorMessage(blockers: readonly string[]): string {
    const firstBlocker = blockers[0];
    const details = firstBlocker === undefined
      ? null
      : HandlePreToolUseUseCase.extractStoryReflectionDetails(firstBlocker);
    const lines: string[] = [];

    if (details !== null) {
      lines.push(`[L2-STORY-REFLECTION] ${details.productPath} に`);
      lines.push(`@story-id ${details.storyId} が反映されていません。`);
      lines.push('');
    } else {
      lines.push('[L2-STORY-REFLECTION] product 文書に @story-id が反映されていません。');
      lines.push('');
    }

    for (const blocker of blockers) {
      lines.push(`- ${blocker}`);
    }

    lines.push('');
    lines.push('修正方法:');
    lines.push('  1. cascade-updater を実行して product 文書を更新');
    lines.push(
      `  2. または手動で該当 product 文書に @story-id ${details?.storyId ?? '<STORY-ID>'} を追加`,
    );
    lines.push('');
    lines.push('参照: ADR-XXX');

    return lines.join('\n');
  }

  private static extractStoryReflectionDetails(
    blocker: string,
  ): { productPath: string; storyId: string } | null {
    const productPathMatch = blocker.match(/docs\/product\/construction\/[^\s]+\.md/);
    const storyIdMatch = blocker.match(/@story-id\s+([A-Z][\w-]*-\d+)|\b([A-Z][\w-]*-\d+)\b/);
    const storyId = storyIdMatch?.[1] ?? storyIdMatch?.[2];

    if (productPathMatch === null || storyId === undefined) {
      return null;
    }

    return {
      productPath: productPathMatch[0],
      storyId,
    };
  }
}
