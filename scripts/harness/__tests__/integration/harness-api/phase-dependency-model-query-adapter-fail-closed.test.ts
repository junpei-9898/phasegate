// @layer test
// @unit harness-api

import { afterEach, describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { PhaseDependencyModelQueryAdapter } from '../../../harness-api/infrastructure/adapters/phase-dependency-model-query-adapter.js';

const createConfigFoundationModuleMock = vi.hoisted(() => vi.fn());

vi.mock('../../../config-foundation/composition-root.js', () => ({
  createConfigFoundationModule: createConfigFoundationModuleMock,
}));

target('PhaseDependencyModelQueryAdapter (fail-closed, 実装経路)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createConfigFoundationModuleMock.mockReset();
  });

  describe('queryAllStories', () => {
    context('依存モジュールの解決が例外を投げる場合', () => {
      it('空配列(=無条件通過)を返さず、原因を保ったまま例外を伝播すること', async () => {
        // Arrange
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        createConfigFoundationModuleMock.mockReturnValue({
          usecases: {
            loadResolvedConfigUseCase: {
              execute: vi.fn().mockRejectedValue(new Error('stories config exploded')),
            },
          },
        });
        const adapter = new PhaseDependencyModelQueryAdapter();

        // Act
        const act = adapter.queryAllStories();

        // Assert
        await expect(act).rejects.toThrow('stories config exploded');
      });
    });
  });

  describe('queryUnit', () => {
    context('依存モジュールの解決が例外を投げる場合', () => {
      it('null(=検出不能の握り潰し)を返さず、原因を保ったまま例外を伝播すること', async () => {
        // Arrange
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        createConfigFoundationModuleMock.mockReturnValue({
          usecases: {
            loadResolvedConfigUseCase: {
              execute: vi.fn().mockRejectedValue(new Error('unit config exploded')),
            },
          },
        });
        const adapter = new PhaseDependencyModelQueryAdapter();

        // Act
        const act = adapter.queryUnit('biome-ast-engine');

        // Assert
        await expect(act).rejects.toThrow('unit config exploded');
      });
    });
  });
});
