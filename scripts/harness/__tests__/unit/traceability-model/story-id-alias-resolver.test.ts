// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { StoryIdAliasResolver } from '../../../traceability-model/domain/services/story-id-alias-resolver.ts';

const createStoryIdAliasResolverSut = (aliases: Readonly<Record<string, string>> = {}) =>
  Object.freeze({
    sut: new StoryIdAliasResolver(
      Object.freeze({
        async getAliasMap() {
          return new Map(
            Object.entries(aliases).map(([legacyId, storyId]) => [
              legacyId,
              Object.freeze({
                value: storyId,
                equals(other: { readonly value: string }) {
                  return other.value === storyId;
                },
              }),
            ]),
          );
        },
      }),
    ),
  });

target('StoryIdAliasResolver.isLegacyFormat', () => {
  describe('レガシー形式を判定する', () => {
    // UT-TM-102
    context('US-XXX形式の場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut();

        // Act
        const actual = sut.isLegacyFormat('US-123');

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-103
    context('HXX-XX形式の場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut();

        // Act
        const actual = sut.isLegacyFormat('H03-01');

        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-TM-104
    context('どちらの形式にも該当しない場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut();

        // Act
        const actual = sut.isLegacyFormat('story-001');

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('StoryIdAliasResolver.resolve', () => {
  describe('レガシーIDを正規StoryIdに解決する', () => {
    // UT-TM-105
    context('alias mapに存在するレガシーIDの場合', () => {
      it('対応する正規StoryIdを返すこと', async () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut({ 'US-123': 'H03-01' });

        // Act
        const actual = await sut.resolve('US-123');

        // Assert
        expect(actual?.value).toBe('H03-01');
      });
    });

    // UT-TM-106
    context('alias mapに存在しないレガシーIDの場合', () => {
      it('nullを返すこと', async () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut({ 'US-123': 'H03-01' });

        // Act
        const actual = await sut.resolve('US-999');

        // Assert
        expect(actual).toBeNull();
      });
    });

    // UT-TM-107
    context('空のalias mapの場合', () => {
      it('nullを返すこと', async () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut({});

        // Act
        const actual = await sut.resolve('US-123');

        // Assert
        expect(actual).toBeNull();
      });
    });
  });
});
