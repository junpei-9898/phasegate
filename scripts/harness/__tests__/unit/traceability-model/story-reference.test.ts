// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { StoryReference } from '../../../traceability-model/domain/value-objects/story-reference.ts';

const createStoryId = (value = 'H03-01') =>
  Object.freeze({
    value,
    equals(other: { readonly value: string }) {
      return other.value === value;
    },
  });

target('StoryReference.resolved', () => {
  describe('照合済みのStoryReferenceを生成する', () => {
    // UT-TM-042
    context('catalogに存在するStoryIdを指定する場合', () => {
      it('resolved=trueかつparse済みStoryIdが設定されたインスタンスを返すこと', () => {
        // Arrange
        const input = Object.freeze({ storyId: createStoryId('H03-01') });

        // Act
        const actual = StoryReference.resolved(input);

        // Assert
        expect(actual.storyId.value).toBe('H03-01');
        expect(actual.resolved).toBe(true);
      });
    });
  });
});

target('StoryReference.unresolved', () => {
  describe('未照合のStoryReferenceを生成する', () => {
    // UT-TM-043
    context('catalogに存在しないStoryIdを指定する場合', () => {
      it('resolved=falseかつparse済みStoryIdが設定されたインスタンスを返すこと', () => {
        // Arrange
        const input = Object.freeze({ storyId: createStoryId('H03-99') });

        // Act
        const actual = StoryReference.unresolved(input);

        // Assert
        expect(actual.storyId.value).toBe('H03-99');
        expect(actual.resolved).toBe(false);
      });
    });
  });
});

target('StoryReference.isResolved', () => {
  describe('照合状態を判定する', () => {
    // UT-TM-044
    context('resolved属性を持つインスタンスを判定する場合', () => {
      it('resolved属性に応じた真偽値を返すこと', () => {
        // Arrange
        const resolvedReference = StoryReference.resolved({
          storyId: createStoryId('H03-01'),
        });
        const unresolvedReference = StoryReference.unresolved({
          storyId: createStoryId('H03-99'),
        });

        // Act
        const actual = [
          resolvedReference.isResolved(),
          unresolvedReference.isResolved(),
        ];

        // Assert
        expect(actual).toEqual([true, false]);
      });
    });
  });
});

target('StoryReference.equals', () => {
  describe('2つのStoryReferenceの等価性を判定する', () => {
    // UT-TM-045
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = StoryReference.resolved({ storyId: createStoryId('H03-01') });
        const other = StoryReference.resolved({ storyId: createStoryId('H03-01') });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
