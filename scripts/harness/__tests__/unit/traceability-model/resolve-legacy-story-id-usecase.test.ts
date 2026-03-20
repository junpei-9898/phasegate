import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { StoryId } from '../../../traceability-model/domain/value-objects/story-id.ts';
import { ResolveLegacyStoryIdUseCase } from '../../../traceability-model/application/usecases/resolve-legacy-story-id-usecase.ts';

const createSut = () => {
  const resolver = {
    isLegacyFormat: vi.fn(),
    resolve: vi.fn(),
  };

  return {
    resolver,
    sut: new ResolveLegacyStoryIdUseCase({ resolver }),
  };
};

target('ResolveLegacyStoryIdUseCase.execute', () => {
  describe('legacy StoryIdを正規StoryIdへ解決する', () => {
    // IT-TM-026
    context('US-001がalias map上H03-01に対応している場合', () => {
      it('legacy形式の入力が正規StoryIdに解決されること', async () => {
        // Arrange
        const { sut, resolver } = createSut();
        resolver.isLegacyFormat.mockReturnValue(true);
        resolver.resolve.mockResolvedValue(StoryId.parse('H03-01'));

        // Act
        const actual = await sut.execute('US-001');

        // Assert
        expect(actual?.toString()).toBe('H03-01');
        expect(resolver.resolve).toHaveBeenCalledWith('US-001');
      });
    });

    // IT-TM-027
    context('すでにH03-01が入力される場合', () => {
      it('非legacy形式の入力がnullを返すこと', async () => {
        // Arrange
        const { sut, resolver } = createSut();
        resolver.isLegacyFormat.mockReturnValue(false);

        // Act
        const actual = await sut.execute('H03-01');

        // Assert
        expect(actual).toBeNull();
        expect(resolver.resolve).not.toHaveBeenCalled();
      });
    });

    // IT-TM-028
    context('alias mapに存在しないlegacy IDの場合', () => {
      it('alias mapに存在しないlegacy IDがnullを返すこと', async () => {
        // Arrange
        const { sut, resolver } = createSut();
        resolver.isLegacyFormat.mockReturnValue(true);
        resolver.resolve.mockResolvedValue(null);

        // Act
        const actual = await sut.execute('US-999');

        // Assert
        expect(actual).toBeNull();
      });
    });

    // IT-TM-029
    context('空文字列が渡される場合', () => {
      it('空文字列が渡された場合にnullを返すこと', async () => {
        // Arrange
        const { sut, resolver } = createSut();
        resolver.isLegacyFormat.mockReturnValue(false);

        // Act
        const actual = await sut.execute('');

        // Assert
        expect(actual).toBeNull();
        expect(resolver.resolve).not.toHaveBeenCalled();
      });
    });
  });
});
