// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { parseUnitComment } from '../../../biome-ast-engine/infrastructure/parsers/unit-comment-parser.js';

target('parseUnitComment', () => {
  describe('ソースコードから@unitコメントを抽出する', () => {
    context('単一 @unit をパースできる', () => {
      it('unitNamesに単一要素の配列が返される', () => {
        // Arrange
        const input = '// @unit order\nexport const x = 1;';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual(['order']);
      });
    });

    context('カンマ区切りの複数 @unit をパースできる', () => {
      it('unitNamesにカンマ区切りの全ユニットが返される', () => {
        // Arrange
        const input = '// @unit order, payment\nexport const x = 1;';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual(['order', 'payment']);
      });
    });

    context('複数行の @unit をパースできる', () => {
      it('unitNamesに複数行の全ユニットが返される', () => {
        // Arrange
        const input = '// @unit order\n// @unit payment\nexport const x = 1;';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual(['order', 'payment']);
      });
    });

    context('カンマ区切りと複数行の混在をパースできる', () => {
      it('unitNamesに全ユニットが返される', () => {
        // Arrange
        const input = '// @unit order, payment\n// @unit shared\nexport const x = 1;';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual(['order', 'payment', 'shared']);
      });
    });

    context('JSDoc 形式をパースできる', () => {
      it('unitNamesが正しく抽出される', () => {
        // Arrange
        const input = '/**\n * @unit order\n */\nexport class X {}';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual(['order']);
      });
    });

    context('@unit がない場合は空配列が返される', () => {
      it('unitNamesが空配列になる', () => {
        // Arrange
        const input = 'export const x = 1;\nconst y = 2;';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual([]);
      });
    });

    context('空文字列の場合は空配列が返される', () => {
      it('unitNamesが空配列になる', () => {
        // Arrange
        const input = '';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual([]);
      });
    });

    context('重複は除去される', () => {
      it('unitNamesに重複がない', () => {
        // Arrange
        const input = '// @unit order\n// @unit order\nexport const x = 1;';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual(['order']);
      });
    });

    context('カンマ周囲の空白は無視される', () => {
      it('unitNamesがトリムされた状態で返される', () => {
        // Arrange
        const input = '// @unit order , payment\nexport const x = 1;';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual(['order', 'payment']);
      });
    });

    context('JSDoc末尾の */ が unitNames に付かないこと', () => {
      it('unitNames末尾に */ が含まれない', () => {
        // Arrange
        const input = '/** @unit my-unit */';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual(['my-unit']);
      });
    });

    context('JSDoc形式でカンマ区切りの複数ユニット', () => {
      it('unitNamesが正しく抽出される', () => {
        // Arrange
        const input = '/** @unit order, payment */';

        // Act
        const actual = parseUnitComment(input);

        // Assert
        expect(actual.unitNames).toEqual(['order', 'payment']);
      });
    });
  });
});
