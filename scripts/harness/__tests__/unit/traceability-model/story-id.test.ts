// @layer test
// @story H03-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  StoryId,
  StoryIdFormatError,
} from '../../../traceability-model/domain/value-objects/story-id.js';

target('StoryId.parse', () => {
  describe('HXX-XX形式の文字列からStoryIdを生成する', () => {
    // UT-TM-001
    context('正規形式の文字列を渡す場合', () => {
      it('正規形式の文字列からStoryIdが生成できること', () => {
        // Arrange
        const input = 'H03-01';

        // Act
        const actual = StoryId.parse(input);

        // Assert
        expect(actual.value).toBe('H03-01');
      });
    });

    // UT-TM-002
    context('前後に空白がある場合', () => {
      it('trimされた値でStoryIdが生成されること', () => {
        // Arrange
        const input = '  H03-01  ';

        // Act
        const actual = StoryId.parse(input);

        // Assert
        expect(actual.value).toBe('H03-01');
      });
    });

    // UT-TM-003
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

    // UT-TM-004
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

    // UT-TM-005
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

    context('HF\\d+-XX形式（Phase 2 拡張 Epic）を渡す場合', () => {
      it('HF2-04 を正常に parse できること', () => {
        // Arrange
        const actual = StoryId.parse('HF2-04');

        // Act
        const value = actual.value;

        // Assert
        expect(value).toBe('HF2-04');
      });

      it('HF10-99 のような複数桁 F-prefix も受理すること', () => {
        // Arrange
        const actual = StoryId.parse('HF10-99');

        // Act
        const value = actual.value;

        // Assert
        expect(value).toBe('HF10-99');
      });
    });
  });
});

target('StoryId.getEpicNumber', () => {
  describe('StoryIdからエピック番号を取得する', () => {
    // UT-TM-006
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

    context('HF\\d+-XX 形式の StoryId を保持している場合', () => {
      it('F-prefix 付きの epic 文字列を返すこと', () => {
        // Arrange
        const sut = StoryId.parse('HF2-04');

        // Act
        const actual = sut.getEpicNumber();

        // Assert
        expect(actual).toBe('F2');
      });
    });
  });
});

target('StoryId.getStoryNumber', () => {
  describe('StoryIdからストーリー番号を取得する', () => {
    // UT-TM-007
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
    // UT-TM-008
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
