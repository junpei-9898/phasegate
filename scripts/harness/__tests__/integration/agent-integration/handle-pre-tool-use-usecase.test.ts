// @unit agent-integration
// @layer application
// @story H11-02

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HandlePreToolUseUseCase } from '../../../agent-integration/application/usecases/handle-pre-tool-use-usecase.js';
import { PhaseGateQueryResult } from '../../../agent-integration/domain/value-objects/phase-gate-query-result.js';
import { StoryReflectionQueryResult } from '../../../agent-integration/domain/value-objects/story-reflection-query-result.js';
import type { ErrorGuidanceQueryPort, ErrorGuidance } from '../../../agent-integration/domain/ports/error-guidance-query-port.js';

function createDefaultMockConfigQueryPort() {
  return {
    isHookEnabled: vi.fn(),
    getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
    getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
    getRelaxedGates: vi.fn().mockResolvedValue([]),
    getProjectPaths: vi.fn().mockReturnValue({
      getSource: () => ['scripts/harness'],
      getDocsInception: () => 'docs/inception',
      getDocsConstruction: () => 'docs/product/construction',
    }),
    getBaselineConfig: vi.fn().mockResolvedValue({
      enabled: false,
      path: '.phasegate/baseline.json',
    }),
  };
}

function createDefaultMockPhaseGateQueryPort() {
  return {
    checkGate: vi.fn().mockResolvedValue(PhaseGateQueryResult.create(true, [], [])),
  };
}

function createDefaultMockStoryReflectionQueryPort() {
  return {
    checkReflection: vi.fn().mockResolvedValue(StoryReflectionQueryResult.pass()),
  };
}

function buildPreToolUseInput(overrides: Partial<{
  toolName: string;
  targetFilePaths: string[];
}> = {}) {
  return {
    toolName: 'str_replace_editor',
    targetFilePaths: [],
    ...overrides,
  };
}

target('HandlePreToolUseUseCase.execute', () => {
  describe('保護ファイルリストへのアクセス制御を行う', () => {
    context('biome.json（デフォルト保護対象）が変更対象の場合', () => {
      // IT-UC-HandlePreToolUse-001
      it('保護対象ファイル（biome.json）への変更がブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['biome.json'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('biome.json');
        expect(actual.blockReason).toBe('PROTECTED_FILE');
      });
    });

    context('tsconfig.json（デフォルト保護対象）が変更対象の場合', () => {
      // IT-UC-HandlePreToolUse-002
      it('保護対象ファイル（tsconfig.json）への変更がブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['tsconfig.json'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('tsconfig.json');
      });
    });

    context('保護対象外ファイルが変更対象の場合', () => {
      // IT-UC-HandlePreToolUse-003
      it('保護対象外ファイルへの変更は通過すること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['src/index.ts'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.blockedFilePath).toBeUndefined();
      });
    });

    context('カスタム追加パターンが設定されている場合', () => {
      // IT-UC-HandlePreToolUse-004
      it('カスタム追加パターンに一致するファイルがブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        mockConfigQueryPort.getProtectedFilePatterns.mockResolvedValue(['custom-protected.json']);
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['custom-protected.json'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('custom-protected.json');
      });
    });

    context('複数ファイルパスのうち1件が保護対象の場合', () => {
      // IT-UC-HandlePreToolUse-005
      it('複数パスのうち1件でも保護対象��一致すればブロックされ、ファイル別ガイダンスが含まれること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['src/index.ts', 'package.json'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('package.json');
        expect(actual.blockReason).toBe('PROTECTED_FILE');
        expect(actual.error?.message).toContain('package.json');
        expect(actual.error?.message).toContain('/quick-implementor');
      });
    });

    context('toolNameが空文字の場合', () => {
      // IT-UC-HandlePreToolUse-006
      it('toolNameが空文字の場合、入力バリデーションエラーになること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({ toolName: '', targetFilePaths: ['src/index.ts'] });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow();
      });
    });

    context('targetFilePathsが空配列の場合', () => {
      // IT-UC-HandlePreToolUse-007
      it('targetFilePathsが空配列の場合、ブロックなしで通過すること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: [] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
      });
    });

    context('biome.json ブロック時のエラーメッセージ', () => {
      // IT-UC-HandlePreToolUse-008
      it('biome.jsonブロック時、result.error.messageにブロックされたファイル名が含まれること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['biome.json'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        const errorText = JSON.stringify(actual.error ?? actual);
        expect(errorText).toContain('biome.json');
      });
    });
  });

  describe('フェーズゲート連携', () => {
    context('フェーズゲートが通過するスコープへの書き込み', () => {
      // IT-UC-HandlePreToolUse-009
      it('フェーズゲートが通過する場合はブロックされないこと', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          targetFilePaths: ['scripts/harness/validator-system/domain/value-objects/example.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(mockPhaseGateQueryPort.checkGate).toHaveBeenCalledOnce();
      });
    });

    context('フェーズゲートが不通過のスコープへの書き込み', () => {
      // IT-UC-HandlePreToolUse-010
      it('フェーズゲート違反の場合はアクショナブルなエラーメッセージでブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['logical design is missing'], []),
          ),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          targetFilePaths: ['scripts/harness/new-unit/domain/entities/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('scripts/harness/new-unit/domain/entities/foo.ts');
        expect(actual.blockReason).toBe('PHASE_GATE');
        expect(actual.error?.message).toContain('フェーズゲート違反');
        expect(actual.error?.message).toContain('logical design is missing');
        expect(actual.error?.message).toContain('/story-implementor');
        expect(actual.phaseGateBlockers).toEqual(['logical design is missing']);
        expect(actual.nextAction).toContain('/story-implementor');
      });
    });

    context('__tests__配下のファイルへの書き込み', () => {
      // IT-UC-HandlePreToolUse-011
      it('テストファイルはフェーズゲートチェックの対象外であること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          targetFilePaths: ['scripts/harness/__tests__/integration/new-unit/some.test.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(mockPhaseGateQueryPort.checkGate).not.toHaveBeenCalled();
      });
    });

    context('scripts/harness外のファイルへの書き込み', () => {
      // IT-UC-HandlePreToolUse-012
      it('ハーネス外のファイルはフェーズゲートチェックの対象外であること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          targetFilePaths: ['src/app/index.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(mockPhaseGateQueryPort.checkGate).not.toHaveBeenCalled();
      });
    });

    context('複数ファイルのうち先頭で検出された有効スコープがフェーズゲート違反の場合', () => {
      // IT-UC-HandlePreToolUse-013
      it('先頭の検出スコープに対してフェーズゲート判定が行われてブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['phase gate blocked'], []),
          ),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          targetFilePaths: ['README.md', 'scripts/harness/agent-integration/domain/value-objects/example.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('README.md');
        expect(mockPhaseGateQueryPort.checkGate).toHaveBeenCalledOnce();
      });
    });

    context('フェーズゲート通過時の出力DTO', () => {
      // IT-UC-HandlePreToolUse-014
      it('通過時はphaseGateBlockersを返さずshouldBlock=falseのみ返ること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          targetFilePaths: ['scripts/harness/agent-integration/domain/value-objects/example.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual).toEqual({ shouldBlock: false });
      });
    });

    // === ISSUE-001追加分: issueパス対応 ===

    context('Unit固有issueパスへのWriteでフェーズゲートが発火する場合', () => {
      it('PhaseGateQueryPort.checkGateがlevel=3, storyId=issueIdで呼ばれること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/tdd_implementation_plan.md'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(mockPhaseGateQueryPort.checkGate).toHaveBeenCalledWith(
          expect.objectContaining({ level: 3, unitId: 'agent-integration', storyId: 'ISSUE-001' }),
          'docs/inception/agent-integration/issues/ISSUE-001/tdd_implementation_plan.md',
        );
      });
    });

    context('横断的issueパスへのWriteの場合', () => {
      it('Level 1スコープとしてcheckGateが呼ばれ通過すること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['docs/inception/issues/ISSUE-001/issue_description.md'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(mockPhaseGateQueryPort.checkGate).toHaveBeenCalledWith(
          expect.objectContaining({ level: 1 }),
          'docs/inception/issues/ISSUE-001/issue_description.md',
        );
      });
    });

    context('issueパスへのReadツール使用の場合', () => {
      it('ReadツールはStep 2対象外のためPhaseGateQueryPortが呼ばれないこと', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Read',
          targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/logical_design.md'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(mockPhaseGateQueryPort.checkGate).not.toHaveBeenCalled();
      });
    });

    context('issueパスでフェーズゲートが不通過の場合', () => {
      it('shouldBlock=trueが返されること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['Level 2 設計が不足しています'], []),
          ),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Edit',
          targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/tdd_implementation_plan.md'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.error).toBeDefined();
        expect(mockPhaseGateQueryPort.checkGate).toHaveBeenCalledWith(
          expect.objectContaining({ level: 3, unitId: 'agent-integration', storyId: 'ISSUE-001' }),
          'docs/inception/agent-integration/issues/ISSUE-001/tdd_implementation_plan.md',
        );
      });
    });

    context('custom プリセット経路で targetFilePath を下位へ受け渡す場合', () => {
      it('Write 対象ファイルの先頭パスが checkGate の第2引数に渡されること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['custom gate blocked'], []),
          ),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/agent-integration/domain/value-objects/example.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('PHASE_GATE');
        expect(mockPhaseGateQueryPort.checkGate).toHaveBeenCalledWith(
          expect.objectContaining({ level: 3, unitId: 'agent-integration' }),
          'scripts/harness/agent-integration/domain/value-objects/example.ts',
        );
      });
    });
  });

  describe('storyReflection 連携', () => {
    context('storyReflectionQueryPort が未指定の場合', () => {
      it('既存動作と同じくブロックせず通過すること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/agent-integration/domain/value-objects/example.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual).toEqual({ shouldBlock: false });
      });
    });

    context('level=3 かつ unitId 解決可能な Write で storyReflection が通過する場合', () => {
      it('storyReflection を実行してそのまま通過すること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockStoryReflectionQueryPort = createDefaultMockStoryReflectionQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          storyReflectionQueryPort: mockStoryReflectionQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/agent-integration/domain/value-objects/example.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual).toEqual({ shouldBlock: false });
        expect(mockStoryReflectionQueryPort.checkReflection).toHaveBeenCalledWith('agent-integration');
      });
    });

    context('level=3 かつ unitId 解決可能な Write で storyReflection が不通過の場合', () => {
      it('storyReflection 形式のエラーメッセージでブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockStoryReflectionQueryPort = {
          checkReflection: vi.fn().mockResolvedValue(
            StoryReflectionQueryResult.block(
              [
                'docs/product/construction/agent-integration/logical_design.md に @story-id US-002 が反映されていません。',
              ],
              [],
            ),
          ),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          storyReflectionQueryPort: mockStoryReflectionQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/agent-integration/domain/value-objects/example.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('STORY_REFLECTION');
        expect(actual.storyReflectionBlockers).toEqual([
          'docs/product/construction/agent-integration/logical_design.md に @story-id US-002 が反映されていません。',
        ]);
        expect(actual.error?.message).toContain('US-002');
        expect(actual.error?.message).toContain('cascade-updater');
      });
    });

    context('level=3 かつ unitId 解決可能な Write で storyReflection が skipped の場合', () => {
      it('Quick Mode 想定で通過すること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockStoryReflectionQueryPort = {
          checkReflection: vi.fn().mockResolvedValue(StoryReflectionQueryResult.skipped()),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          storyReflectionQueryPort: mockStoryReflectionQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Edit',
          targetFilePaths: ['scripts/harness/agent-integration/domain/value-objects/example.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual).toEqual({ shouldBlock: false });
        expect(mockStoryReflectionQueryPort.checkReflection).toHaveBeenCalledOnce();
      });
    });

    context('level=1 や level=2 のパス、または scope 解決不可の場合', () => {
      it('storyReflection は発火しないこと', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockStoryReflectionQueryPort = createDefaultMockStoryReflectionQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          storyReflectionQueryPort: mockStoryReflectionQueryPort,
        });

        // Act
        await useCase.execute(buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['docs/product/product_overview.md'],
        }));
        await useCase.execute(buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['docs/product/construction/agent-integration/logical_design.md'],
        }));
        await useCase.execute(buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['README.md'],
        }));

        // Assert
        expect(mockStoryReflectionQueryPort.checkReflection).not.toHaveBeenCalled();
      });
    });

    context('既存の Phase Gate ブロックが先に発生する場合', () => {
      it('storyReflection は実行されず既存ブロックが優先されること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['logical design is missing'], []),
          ),
        };
        const mockStoryReflectionQueryPort = createDefaultMockStoryReflectionQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          storyReflectionQueryPort: mockStoryReflectionQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/agent-integration/domain/value-objects/example.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.blockReason).toBe('PHASE_GATE');
        expect(mockStoryReflectionQueryPort.checkReflection).not.toHaveBeenCalled();
      });
    });

    context('__tests__ 配下のパスが対象の場合', () => {
      it('storyReflection も発火しないこと', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockStoryReflectionQueryPort = createDefaultMockStoryReflectionQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          storyReflectionQueryPort: mockStoryReflectionQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/__tests__/integration/agent-integration/sample.test.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual).toEqual({ shouldBlock: false });
        expect(mockStoryReflectionQueryPort.checkReflection).not.toHaveBeenCalled();
      });
    });
  });

  describe('FULL_MODE_REQUIRED 検出 (ISSUE-006 Story B)', () => {
    context('fullModeRequirementQueryPort が requiresFullMode=true を返すとき', () => {
      it('Write ツールの場合、FULL_MODE_REQUIRED でブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockFullModeRequirementQueryPort = {
          check: vi.fn().mockResolvedValue({
            requiresFullMode: true,
            rejectionRule: 'NEW_DOMAIN' as const,
            rejectionReason: 'domain ファイル新規作成が検出されました',
            dominantCategory: 'domain',
          }),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          fullModeRequirementQueryPort: mockFullModeRequirementQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/some-unit/domain/new-entity.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('FULL_MODE_REQUIRED');
        expect(actual.fullModeRejectionRule).toBe('NEW_DOMAIN');
        expect(actual.fullModeDominantCategory).toBe('domain');
        expect(actual.error?.message).toContain('Full mode 必須変更が検出されました');
        expect(actual.error?.message).toContain('/story-implementor');
        expect(mockFullModeRequirementQueryPort.check).toHaveBeenCalledWith([
          'scripts/harness/some-unit/domain/new-entity.ts',
        ]);
      });
    });

    context('fullModeRequirementQueryPort が requiresFullMode=false を返すとき', () => {
      it('ブロックされず後続のストーリー反映チェックに進むこと', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockStoryReflectionQueryPort = createDefaultMockStoryReflectionQueryPort();
        const mockFullModeRequirementQueryPort = {
          check: vi.fn().mockResolvedValue({ requiresFullMode: false }),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          storyReflectionQueryPort: mockStoryReflectionQueryPort,
          fullModeRequirementQueryPort: mockFullModeRequirementQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(mockFullModeRequirementQueryPort.check).toHaveBeenCalledOnce();
      });
    });

    context('fullModeRequirementQueryPort 未注入のとき', () => {
      it('既存挙動を保ち fullMode チェックがスキップされること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
      });
    });

    context('Write ツール以外のとき', () => {
      it('fullMode チェックが発火せずスキップされること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockFullModeRequirementQueryPort = {
          check: vi.fn().mockResolvedValue({ requiresFullMode: true }),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          fullModeRequirementQueryPort: mockFullModeRequirementQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Read',
          targetFilePaths: ['scripts/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(mockFullModeRequirementQueryPort.check).not.toHaveBeenCalled();
      });
    });

    context('Phase Gate ブロックが優先されるとき', () => {
      it('fullMode チェックが発火しないこと', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['docs/product/construction/foo/logical_design.md が存在しません'], []),
          ),
        };
        const mockFullModeRequirementQueryPort = {
          check: vi.fn().mockResolvedValue({ requiresFullMode: true }),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          fullModeRequirementQueryPort: mockFullModeRequirementQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/foo/domain/new.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('PHASE_GATE');
        expect(mockFullModeRequirementQueryPort.check).not.toHaveBeenCalled();
      });
    });
  });

  describe('Baseline Grandfather (ISSUE-007 Wave 2)', () => {
    function grandfatherPort(allGrandfathered: boolean) {
      return {
        check: vi.fn().mockResolvedValue({
          allGrandfathered,
          baselineEnabled: true,
          grandfatheredPaths: allGrandfathered ? ['scripts/harness/foo.ts'] : [],
        }),
      };
    }

    context('allGrandfathered=true + Phase Gate ブロッカー有', () => {
      it('IT-AI-GF-001: grandfather skip で shouldBlock=false', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(
              false,
              ['docs/product/construction/foo/logical_design.md が存在しません'],
              [],
            ),
          ),
        };
        const logger = vi.fn();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          baselineGrandfatherQueryPort: grandfatherPort(true),
          grandfatherLogger: logger,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(logger).toHaveBeenCalledWith('phase-gate', ['scripts/harness/foo.ts']);
      });
    });

    context('allGrandfathered=true + FULL_MODE_REQUIRED 検出', () => {
      it('IT-AI-GF-002: fullMode check が呼ばれず shouldBlock=false', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockFullModeRequirementQueryPort = {
          check: vi.fn().mockResolvedValue({
            requiresFullMode: true,
            rejectionRule: 'NEW_DOMAIN' as const,
          }),
        };
        const logger = vi.fn();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          fullModeRequirementQueryPort: mockFullModeRequirementQueryPort,
          baselineGrandfatherQueryPort: grandfatherPort(true),
          grandfatherLogger: logger,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/foo/domain/entity.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(mockFullModeRequirementQueryPort.check).not.toHaveBeenCalled();
        expect(logger).toHaveBeenCalledWith('full-mode', [
          'scripts/harness/foo/domain/entity.ts',
        ]);
      });
    });

    context('allGrandfathered=true + STORY_REFLECTION 違反', () => {
      it('IT-AI-GF-003: story-reflection check が呼ばれず shouldBlock=false', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockStoryReflectionQueryPort = {
          checkReflection: vi.fn(),
        };
        const logger = vi.fn();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          storyReflectionQueryPort: mockStoryReflectionQueryPort,
          baselineGrandfatherQueryPort: grandfatherPort(true),
          grandfatherLogger: logger,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(mockStoryReflectionQueryPort.checkReflection).not.toHaveBeenCalled();
      });
    });

    context('allGrandfathered=true + PROTECTED_FILE', () => {
      it('IT-AI-GF-004: PROTECTED_FILE は grandfather 対象外で shouldBlock=true', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          baselineGrandfatherQueryPort: grandfatherPort(true),
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['biome.json'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('PROTECTED_FILE');
      });
    });

    context('allGrandfathered=false + Phase Gate ブロック', () => {
      it('IT-AI-GF-005: 既存通り Phase Gate でブロック', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(
              false,
              ['docs/product/construction/foo/logical_design.md が存在しません'],
              [],
            ),
          ),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          baselineGrandfatherQueryPort: grandfatherPort(false),
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/foo/domain/new.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('PHASE_GATE');
      });
    });

    context('baselineGrandfatherQueryPort 未注入', () => {
      it('IT-AI-GF-006: 既存挙動維持（backward compatible）', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
      });
    });
  });

  // ISSUE-007 Wave 3 / H12-03: ErrorGuidance actionable fields
  describe('ErrorGuidance actionable fields (ISSUE-007 Wave 3)', () => {
    const guidance = (partial: Partial<ErrorGuidance> = {}): ErrorGuidance => ({
      suggestedSkill: partial.suggestedSkill ?? null,
      scaffoldCommand: partial.scaffoldCommand ?? null,
      templatePath: partial.templatePath ?? null,
    });

    const guidancePort = (value: ErrorGuidance | null): ErrorGuidanceQueryPort => ({
      getGuidance: vi.fn().mockResolvedValue(value),
    });

    context('PHASE_GATE violation + ErrorGuidanceQueryPort 注入', () => {
      // IT-AI-GUIDE-001
      it('scaffoldCommand と templatePath がエラーメッセージに含まれること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['logical_design.md missing'], []),
          ),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          errorGuidanceQueryPort: guidancePort(
            guidance({
              suggestedSkill: '/logical-designer',
              scaffoldCommand: 'npx phasegate scaffold-design --unit my-unit --phase logical',
              templatePath: 'templates/logical_design.template.md',
            }),
          ),
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/my-unit/domain/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('PHASE_GATE');
        expect(actual.error?.message).toContain('/logical-designer');
        expect(actual.error?.message).toContain('npx phasegate scaffold-design --unit my-unit --phase logical');
        expect(actual.error?.message).toContain('templates/logical_design.template.md');
      });

      // IT-AI-GUIDE-002
      it('ErrorGuidanceQueryPort が null を返した場合は従来のハードコード message が使われること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['logical_design.md missing'], []),
          ),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          errorGuidanceQueryPort: guidancePort(null),
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/my-unit/domain/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.error?.message).toContain('/story-implementor');
        expect(actual.error?.message).not.toContain('scaffold-design');
      });

      // IT-AI-GUIDE-003
      it('ErrorGuidanceQueryPort 未注入の場合は従来挙動（backward compatible）', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['logical_design.md missing'], []),
          ),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/my-unit/domain/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.error?.message).toContain('/story-implementor');
        expect(actual.error?.message).not.toContain('scaffold-design');
      });
    });

    context('FULL_MODE_REQUIRED violation + ErrorGuidanceQueryPort 注入', () => {
      // IT-AI-GUIDE-004
      it('scaffold CLI と template パスが FULL_MODE_REQUIRED message に含まれること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockFullModeQueryPort = {
          check: vi.fn().mockResolvedValue({
            requiresFullMode: true,
            rejectionRule: 'MIXED_CHANGES' as const,
            rejectionReason: 'allowedCategories 外',
            dominantCategory: 'domain',
          }),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          fullModeRequirementQueryPort: mockFullModeQueryPort,
          errorGuidanceQueryPort: guidancePort(
            guidance({
              suggestedSkill: '/story-implementor',
              scaffoldCommand: 'npx phasegate scaffold-design --unit x --phase logical',
              templatePath: 'templates/logical_design.template.md',
            }),
          ),
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/new-unit/domain/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('FULL_MODE_REQUIRED');
        expect(actual.error?.message).toContain('/story-implementor');
        expect(actual.error?.message).toContain('npx phasegate scaffold-design --unit x --phase logical');
        expect(actual.error?.message).toContain('templates/logical_design.template.md');
      });
    });

    context('scaffoldCommand の <unit-id> プレースホルダ置換 (ISSUE-007 Wave 9)', () => {
      // IT-AI-GUIDE-UID-001
      it('PHASE_GATE: metadata.unitId で <unit-id> を置換すること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['logical_design.md missing'], []),
          ),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          errorGuidanceQueryPort: guidancePort(
            guidance({
              suggestedSkill: '/story-implementor',
              scaffoldCommand: 'npx phasegate scaffold-design --unit <unit-id> --phase logical',
              templatePath: 'templates/logical_design.template.md',
            }),
          ),
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/payments/domain/charge.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('PHASE_GATE');
        expect(actual.error?.message).toContain('scaffold: npx phasegate scaffold-design --unit payments --phase logical');
        expect(actual.error?.message).not.toContain('<unit-id>');
      });

      // IT-AI-GUIDE-UID-002
      it('FULL_MODE_REQUIRED: targetFilePaths から導出した unitId で <unit-id> を置換すること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = createDefaultMockPhaseGateQueryPort();
        const mockFullModeQueryPort = {
          check: vi.fn().mockResolvedValue({
            requiresFullMode: true,
            rejectionRule: 'NEW_DOMAIN' as const,
            rejectionReason: '新規ドメインモデル検出',
            dominantCategory: 'domain',
          }),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          fullModeRequirementQueryPort: mockFullModeQueryPort,
          errorGuidanceQueryPort: guidancePort(
            guidance({
              suggestedSkill: '/story-implementor',
              scaffoldCommand: 'npx phasegate scaffold-design --unit <unit-id> --phase logical',
              templatePath: 'templates/logical_design.template.md',
            }),
          ),
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/billing/domain/invoice.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('FULL_MODE_REQUIRED');
        expect(actual.error?.message).toContain('scaffold: npx phasegate scaffold-design --unit billing --phase logical');
        expect(actual.error?.message).not.toContain('<unit-id>');
      });

    });

    context('ErrorGuidanceQueryPort が例外を throw した場合', () => {
      // IT-AI-GUIDE-005
      it('graceful degradation — 従来挙動（ハードコード message）で block されること', async () => {
        // Arrange
        const mockConfigQueryPort = createDefaultMockConfigQueryPort();
        const mockPhaseGateQueryPort = {
          checkGate: vi.fn().mockResolvedValue(
            PhaseGateQueryResult.create(false, ['blocker'], []),
          ),
        };
        const explodingPort: ErrorGuidanceQueryPort = {
          getGuidance: vi.fn().mockRejectedValue(new Error('registry lookup failed')),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          phaseGateQueryPort: mockPhaseGateQueryPort,
          errorGuidanceQueryPort: explodingPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'Write',
          targetFilePaths: ['scripts/harness/my-unit/domain/foo.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockReason).toBe('PHASE_GATE');
        expect(actual.error?.message).toContain('/story-implementor');
      });
    });
  });
});
