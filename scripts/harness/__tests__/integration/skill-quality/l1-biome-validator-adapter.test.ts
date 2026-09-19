// @work-item-id WI-220
// @story H12-03
// @unit skill-quality
// @layer test

import { afterEach, describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { L1BiomeValidatorAdapter } from '../../../skill-quality/infrastructure/adapters/l1-biome-validator-adapter.js';
import { CommitMessage } from '../../../skill-quality/domain/value-objects/commit-message.js';

const createBiomeAstEngineModuleMock = vi.hoisted(() => vi.fn());

vi.mock('../../../biome-ast-engine/composition-root.js', () => ({
  createBiomeAstEngineModule: createBiomeAstEngineModuleMock,
}));

target('L1BiomeValidatorAdapter (fail-closed)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createBiomeAstEngineModuleMock.mockReset();
  });

  describe('validate', () => {
    it('呼出元の解析ルートと設定を維持して検証すること', async () => {
      // Arrange
      const config = { l1Config: { enabled: false, rules: {} }, architecture: { preset: 'flat' as const, layers: [], allowedDependencies: {} } };
      const execute = vi.fn().mockResolvedValue({ report: { violations: [] } });
      createBiomeAstEngineModuleMock.mockReturnValue({ executeLintUseCase: { execute } });
      const adapter = new L1BiomeValidatorAdapter({ rootDir: '/fixture/project', config });

      // Act
      const actual = await adapter.validate(CommitMessage.create('skill-quality', 'WI-220', 'change'));

      // Assert
      expect(actual).toEqual([]);
      expect(createBiomeAstEngineModuleMock).toHaveBeenCalledWith('/fixture/project', config);
      expect(execute).toHaveBeenCalledWith({ targets: [] });
    });

    context('依存する biome-ast-engine の生成が例外を投げる場合', () => {
      it('合格扱いにせず、L1-VALIDATOR-ERROR の違反を1件以上返すこと', async () => {
        // Arrange
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        createBiomeAstEngineModuleMock.mockImplementation(() => {
          throw new Error('biome engine boom');
        });
        const adapter = new L1BiomeValidatorAdapter();
        const commitMessage = CommitMessage.create('skill-quality', 'H12-01', 'テスト用コミット');

        // Act
        const actual = await adapter.validate(commitMessage);

        // Assert
        expect(actual.length).toBe(1);
        expect(actual[0].ruleId).toBe('L1-VALIDATOR-ERROR');
        expect(actual[0].message).toContain('biome engine boom');
      });
    });

    context('lint 実行 (executeLintUseCase.execute) が例外を投げる場合', () => {
      it('合格扱いにせず、原因メッセージを含む違反を返すこと', async () => {
        // Arrange
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        createBiomeAstEngineModuleMock.mockReturnValue({
          executeLintUseCase: {
            execute: vi.fn().mockRejectedValue(new Error('lint execute crashed')),
          },
        });
        const adapter = new L1BiomeValidatorAdapter();
        const commitMessage = CommitMessage.create('skill-quality', 'H12-01', 'テスト用コミット');

        // Act
        const actual = await adapter.validate(commitMessage);

        // Assert
        expect(actual.length).toBe(1);
        expect(actual[0].ruleId).toBe('L1-VALIDATOR-ERROR');
        expect(actual[0].message).toContain('lint execute crashed');
      });
    });
  });
});
