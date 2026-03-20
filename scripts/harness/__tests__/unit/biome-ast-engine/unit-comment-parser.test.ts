import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { parseUnitComment } from '../../../biome-ast-engine/infrastructure/parsers/unit-comment-parser.js';

target('parseUnitComment', () => {
  describe('ソースコードから@unitコメントを抽出する', () => {
    context('単一行コメント形式 "// @unit foo" が含まれる場合', () => {
      it('unitNameが抽出される', () => {
        // Arrange
        const input = '// @unit config-foundation\nexport const x = 1;';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitName).toBe('config-foundation');
      });
    });

    context('JSDocブロック形式 "/** @unit foo */" が含まれる場合', () => {
      it('unitNameが抽出される', () => {
        // Arrange
        const input = '/**\n * @unit biome-ast-engine\n */\nexport class X {}';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitName).toBe('biome-ast-engine');
      });
    });

    context('ブロックコメント形式 "/* @unit foo */" が含まれる場合', () => {
      it('unitNameが抽出される', () => {
        // Arrange
        const input = '/* @unit harness-error */\nconst y = 2;';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitName).toBe('harness-error');
      });
    });

    context('@unitコメントが存在しない場合', () => {
      it('unitNameがnullになる', () => {
        // Arrange
        const input = 'export const x = 1;\nconst y = 2;';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitName).toBeNull();
      });
    });

    context('空文字列の場合', () => {
      it('unitNameがnullになる', () => {
        // Arrange
        const input = '';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitName).toBeNull();
      });
    });

    context('@unitの前にスペースがある場合', () => {
      it('unitNameが正しく抽出される', () => {
        // Arrange
        const input = '  // @unit   spaced-unit';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitName).toBe('spaced-unit');
      });
    });

    context('JSDoc末尾の */ が unitName に付かないこと', () => {
      it('unitName末尾に */ が含まれない', () => {
        // Arrange
        const input = '/** @unit my-unit */';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitName).toBe('my-unit');
      });
    });
  });
});
