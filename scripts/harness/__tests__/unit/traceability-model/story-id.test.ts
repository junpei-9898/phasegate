import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  StoryId,
  StoryIdFormatError,
} from '../../../traceability-model/domain/value-objects/story-id.js';

target('StoryId.parse', () => {
  describe('HXX-XX形式の文字列からStoryIdを生成する', () => {
    context('HXX-XX形式でない文字列を渡す場合', () => {
      it('形式エラーが発生すること', () => {
        // Arrange
        const actual = () => StoryId.parse('HX-1');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(StoryIdFormatError);
      });
    });

    context('US-XXX形式の文字列を渡す場合', () => {
      it('形式エラーが発生すること', () => {
        // Arrange
        const actual = () => StoryId.parse('US-123');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(StoryIdFormatError);
      });
    });

    context('空文字を渡す場合', () => {
      it('形式エラーが発生すること', () => {
        // Arrange
        const actual = () => StoryId.parse('');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(StoryIdFormatError);
      });
    });
  });
});

target('StoryId.getEpicNumber', () => {
  describe('StoryIdからエピック番号を取得する', () => {
    context('正規のStoryIdを保持している場合', () => {
      it('正しいエピック番号を返すこと', () => {
        // Arrange
        const sut = StoryId.parse('H12-34');

        // Act
        const actual = sut.getEpicNumber();

        // Assert
        expect(actual).toBe('12');
      });
    });
  });
});

target('StoryId.getStoryNumber', () => {
  describe('StoryIdからストーリー番号を取得する', () => {
    context('正規のStoryIdを保持している場合', () => {
      it('正しいストーリー番号を返すこと', () => {
        // Arrange
        const sut = StoryId.parse('H12-34');

        // Act
        const actual = sut.getStoryNumber();

        // Assert
        expect(actual).toBe('34');
      });
    });
  });
});

target('StoryId.equals', () => {
  describe('2つのStoryIdの等価性を判定する', () => {
    context('同一値のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = StoryId.parse('H03-01');
        const other = StoryId.parse('H03-01');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
