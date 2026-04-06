// @layer test
import { expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { TraceabilityModelStoryRegistryAdapter } from '../../../../nyquist-validation/infrastructure/adapters/traceability-model-story-registry-adapter.js';

target('TraceabilityModelStoryRegistryAdapter', () => {
  context('getValidStoryIdsを呼ぶ場合', () => {
    it('有効storyId一覧が返ること', async () => {
      // Arrange
      const getStoryIds = vi.fn().mockResolvedValue(['H07-01', 'H07-02', 'H07-03', 'H07-04']);
      const adapter = new TraceabilityModelStoryRegistryAdapter({ getStoryIds });

      // Act
      const actual = await adapter.getValidStoryIds();

      // Assert
      expect(actual).toHaveLength(4);
      expect(actual[0]).toMatch(/^H\d{2}-\d{2}$/);
    });

    it('storyIdが0件の場合、空配列が返ること', async () => {
      // Arrange
      const adapter = new TraceabilityModelStoryRegistryAdapter({
        getStoryIds: vi.fn().mockResolvedValue([]),
      });

      // Act
      const actual = await adapter.getValidStoryIds();

      // Assert
      expect(actual).toEqual([]);
    });

    it('依存コールバックが失敗した場合、エラーがthrowされること', async () => {
      // Arrange
      const adapter = new TraceabilityModelStoryRegistryAdapter({
        getStoryIds: vi.fn().mockRejectedValue(new Error('traceability-model error')),
      });

      // Act & Assert
      await expect(adapter.getValidStoryIds()).rejects.toThrow('traceability-model error');
    });

    it('getValidStoryIdsは依存コールバックをそのまま1回呼ぶこと', async () => {
      // Arrange
      const getStoryIds = vi.fn().mockResolvedValue(['H07-01']);
      const adapter = new TraceabilityModelStoryRegistryAdapter({ getStoryIds });

      // Act
      const actual = await adapter.getValidStoryIds();

      // Assert
      expect(actual).toEqual(['H07-01']);
      expect(getStoryIds).toHaveBeenCalledTimes(1);
    });
  });
});

// @story-id H08-07