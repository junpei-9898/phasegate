import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { StoryIdAnnotation } from '../../../traceability-model/domain/value-objects/story-id-annotation.ts';

const createStoryId = (value = 'H03-01') =>
  Object.freeze({
    value,
    equals(other: { readonly value: string }) {
      return other.value === value;
    },
  });

const createStoryIdAnnotation = (
  overrides: Partial<{
    storyId: ReturnType<typeof createStoryId>;
    lineNumber: number;
    contextLine: string;
    standaloneLine: boolean;
  }> = {},
) =>
  StoryIdAnnotation.create(
    Object.freeze({
      storyId: createStoryId(),
      lineNumber: 8,
      contextLine: '## StoryIdを検証する',
      standaloneLine: true,
      ...overrides,
    }),
  );

target('StoryIdAnnotation.create', () => {
  describe('設計文書のstory-idアノテーションを生成する', () => {
    // UT-TM-046
    context('正しい引数を渡す場合', () => {
      it('storyIdとlineNumberとcontextLineとstandaloneLineが正しく設定されること', () => {
        // Arrange
        const input = Object.freeze({
          storyId: createStoryId('H03-01'),
          lineNumber: 12,
          contextLine: '## StoryId',
          standaloneLine: true,
        });

        // Act
        const actual = StoryIdAnnotation.create(input);

        // Assert
        expect(actual.storyId.value).toBe('H03-01');
        expect(actual.lineNumber).toBe(12);
        expect(actual.contextLine).toBe('## StoryId');
        expect(actual.standaloneLine).toBe(true);
      });
    });

    // UT-TM-047
    context('lineNumberが0以下の場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () =>
          StoryIdAnnotation.create(
            Object.freeze({
              storyId: createStoryId('H03-01'),
              lineNumber: 0,
              contextLine: '## StoryId',
              standaloneLine: true,
            }),
          );

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });
  });
});

target('StoryIdAnnotation.isStandalone', () => {
  describe('独立行判定を行う', () => {
    // UT-TM-048
    context('standaloneLine=trueの場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createStoryIdAnnotation({ standaloneLine: true });

        // Act
        const actual = sut.isStandalone();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-049
    context('standaloneLine=falseの場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createStoryIdAnnotation({ standaloneLine: false });

        // Act
        const actual = sut.isStandalone();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('StoryIdAnnotation.equals', () => {
  describe('2つのStoryIdAnnotationの等価性を判定する', () => {
    // UT-TM-050
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createStoryIdAnnotation();
        const other = createStoryIdAnnotation();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
