// @layer test
import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  PhaseDependencyModelQueryAdapter,
  type IPhaseDependencyModelStub,
} from '../../../harness-api/infrastructure/adapters/phase-dependency-model-query-adapter.js';

target('PhaseDependencyModelQueryAdapter', () => {
  // ─── IT-Adapter-PhaseQuery-001 ───
  describe('queryAllStories: スタブが全ストーリー通過データを返す場合', () => {
    context('stubがPhaseGateStoryResult[]を返す場合', () => {
      it('PhaseGateStoryResult[]がそのまま返される', async () => {
        // Arrange
        const stub: IPhaseDependencyModelStub = {
          queryAllStories: vi.fn().mockResolvedValue([
            { storyId: 'H09-01', passed: true, missingPhases: [] },
            { storyId: 'H09-02', passed: true, missingPhases: [] },
          ]),
          queryUnit: vi.fn(),
        };
        const adapter = new PhaseDependencyModelQueryAdapter(stub);

        // Act
        const actual = await adapter.queryAllStories();

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual[0].storyId).toBe('H09-01');
        expect(actual[0].passed).toBe(true);
      });
    });
  });

  // ─── IT-Adapter-PhaseQuery-002 ───
  describe('queryAllStories: スタブが空配列を返す場合', () => {
    context('stubが[]を返す場合', () => {
      it('空配列が返される', async () => {
        // Arrange
        const stub: IPhaseDependencyModelStub = {
          queryAllStories: vi.fn().mockResolvedValue([]),
          queryUnit: vi.fn(),
        };
        const adapter = new PhaseDependencyModelQueryAdapter(stub);

        // Act
        const actual = await adapter.queryAllStories();

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  // ─── IT-Adapter-PhaseQuery-003 ───
  describe('queryUnit: 存在するUnitのPhaseInfoを返す場合', () => {
    context('stubがPhaseInfo(unitId=harness-api)を返す場合', () => {
      it('PhaseInfoがそのまま返される', async () => {
        // Arrange
        const stub: IPhaseDependencyModelStub = {
          queryAllStories: vi.fn(),
          queryUnit: vi.fn().mockResolvedValue({
            unitId: 'harness-api',
            currentLevel: 3,
            currentPhase: 'testing',
            completedGates: ['domain-design', 'logical-design', 'construction'],
          }),
        };
        const adapter = new PhaseDependencyModelQueryAdapter(stub);

        // Act
        const actual = await adapter.queryUnit('harness-api');

        // Assert
        expect(actual).not.toBeNull();
        expect(actual?.unitId).toBe('harness-api');
        expect(actual?.currentLevel).toBe(3);
      });
    });
  });

  // ─── IT-Adapter-PhaseQuery-004 ───
  describe('queryUnit: 存在しないUnitの場合nullを返すこと', () => {
    context('stubがnullを返す場合', () => {
      it('nullが返される', async () => {
        // Arrange
        const stub: IPhaseDependencyModelStub = {
          queryAllStories: vi.fn(),
          queryUnit: vi.fn().mockResolvedValue(null),
        };
        const adapter = new PhaseDependencyModelQueryAdapter(stub);

        // Act
        const actual = await adapter.queryUnit('non-existent-unit');

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  // ─── IT-Adapter-PhaseQuery-005 ───
  describe('スタブ未指定（デフォルト）の場合、実際のphase-dependency-modelを呼び出すこと', () => {
    context('コンストラクタ引数なしで生成した場合', () => {
      it('queryAllStoriesが実ストーリー一覧を返し、queryUnitが既知Unitのフェーズ情報を返す', async () => {
        // Arrange
        const adapter = new PhaseDependencyModelQueryAdapter();

        // Act
        const storiesResult = await adapter.queryAllStories();
        // biome-ast-engineは有効なUnitなのでnull以外が返される
        const unitResult = await adapter.queryUnit('biome-ast-engine');

        // Assert — スタブではなく実実装が呼ばれることを確認
        expect(Array.isArray(storiesResult)).toBe(true);
        expect(storiesResult.length).toBeGreaterThan(0);
        expect(unitResult).not.toBeNull();
        expect(unitResult?.unitId).toBe('biome-ast-engine');
      });
    });
  });
});
