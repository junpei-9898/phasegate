// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { parseCommentDensity } from '../../../biome-ast-engine/infrastructure/parsers/comment-density-parser.js';

target('parseCommentDensity', () => {
  describe('コメント密度と繰り返しブロック数を計算する', () => {
    context('コメントが無いコードの場合', () => {
      it('commentLineCountが0になる', () => {
        // Arrange
        const input = 'const x = 1;\nconst y = 2;';

        // Act
        const actual = parseCommentDensity(input);

        // Assert
        expect(actual.commentLineCount).toBe(0);
        expect(actual.logicalLineCount).toBe(2);
        expect(actual.repeatedCommentBlocks).toBe(0);
      });
    });

    context('単一行コメントのみの場合', () => {
      it('コメント行がカウントされる', () => {
        // Arrange
        const input = '// comment A\nconst x = 1;\n// comment B\nconst y = 2;';

        // Act
        const actual = parseCommentDensity(input);

        // Assert
        expect(actual.commentLineCount).toBe(2);
        expect(actual.logicalLineCount).toBe(4);
      });
    });

    context('複数行コメントが含まれる場合', () => {
      it('ブロックコメントの全行がカウントされる', () => {
        // Arrange
        const input = '/*\n * line 1\n * line 2\n */\nconst x = 1;';

        // Act
        const actual = parseCommentDensity(input);

        // Assert
        expect(actual.commentLineCount).toBe(4);
        expect(actual.logicalLineCount).toBe(5);
      });
    });

    context('同一コメントブロックが繰り返される場合', () => {
      it('repeatedCommentBlocksが検出される', () => {
        // Arrange
        const input = [
          '// TODO: fix this',
          'const a = 1;',
          '',
          '// TODO: fix this',
          'const b = 2;',
        ].join('\n');

        // Act
        const actual = parseCommentDensity(input);

        // Assert
        expect(actual.repeatedCommentBlocks).toBe(1);
      });
    });

    context('空文字列の場合', () => {
      it('全て0になる', () => {
        // Arrange
        const input = '';

        // Act
        const actual = parseCommentDensity(input);

        // Assert
        expect(actual.commentLineCount).toBe(0);
        expect(actual.logicalLineCount).toBe(0);
        expect(actual.repeatedCommentBlocks).toBe(0);
      });
    });

    context('空行のみの場合', () => {
      it('logicalLineCountが0になる', () => {
        // Arrange
        const input = '\n\n\n';

        // Act
        const actual = parseCommentDensity(input);

        // Assert
        expect(actual.logicalLineCount).toBe(0);
      });
    });

    context('インラインブロックコメント /* ... */ が1行にある場合', () => {
      it('1行としてカウントされる', () => {
        // Arrange
        const input = '/* single line block comment */\nconst x = 1;';

        // Act
        const actual = parseCommentDensity(input);

        // Assert
        expect(actual.commentLineCount).toBe(1);
        expect(actual.logicalLineCount).toBe(2);
      });
    });

    context('3回同一コメントが出現する場合', () => {
      it('repeatedCommentBlocksが2になる', () => {
        // Arrange
        const input = [
          '// duplicate',
          'const a = 1;',
          '',
          '// duplicate',
          'const b = 2;',
          '',
          '// duplicate',
          'const c = 3;',
        ].join('\n');

        // Act
        const actual = parseCommentDensity(input);

        // Assert
        expect(actual.repeatedCommentBlocks).toBe(2);
      });
    });
  });
});
