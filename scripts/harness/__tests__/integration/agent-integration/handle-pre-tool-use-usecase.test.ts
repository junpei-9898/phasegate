// @unit agent-integration
// @layer application
// @story H11-02

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HandlePreToolUseUseCase } from '../../../agent-integration/application/usecases/handle-pre-tool-use-usecase.js';
import { PhaseGateQueryResult } from '../../../agent-integration/domain/value-objects/phase-gate-query-result.js';
import { StoryReflectionQueryResult } from '../../../agent-integration/domain/value-objects/story-reflection-query-result.js';

function createDefaultMockConfigQueryPort() {
  return {
    isHookEnabled: vi.fn(),
    getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
    getProjectPaths: vi.fn().mockReturnValue({
      getSource: () => ['scripts/harness'],
      getDocsInception: () => 'docs/inception',
      getDocsConstruction: () => 'docs/product/construction',
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
});
