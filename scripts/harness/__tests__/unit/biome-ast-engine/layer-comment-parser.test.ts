import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { parseLayerComment } from '../../../biome-ast-engine/infrastructure/parsers/layer-comment-parser.js';

target('parseLayerComment', () => {
  describe('ソースコードから@layerコメントを抽出する', () => {
    context('単一行コメント形式 "// @layer domain" が含まれる場合', () => {
      it('layerNameが抽出される', () => {
        // Arrange
        const input = '// @layer domain\nexport class X {}';

        // Act
        const actual = parseLayerComment(input);

        // Assert
        expect(actual.layerName).toBe('domain');
      });
    });

    context('JSDocブロック形式 "/** @layer infrastructure */" が含まれる場合', () => {
      it('layerNameが抽出される', () => {
        // Arrange
        const input = '/**\n * @layer infrastructure\n */\nexport class Y {}';

        // Act
        const actual = parseLayerComment(input);

        // Assert
        expect(actual.layerName).toBe('infrastructure');
      });
    });

    context('ブロックコメント形式 "/* @layer application */" が含まれる場合', () => {
      it('layerNameが抽出される', () => {
        // Arrange
        const input = '/* @layer application */\nconst y = 2;';

        // Act
        const actual = parseLayerComment(input);

        // Assert
        expect(actual.layerName).toBe('application');
      });
    });

    context('@layerコメントが存在しない場合', () => {
      it('layerNameがnullになる', () => {
        // Arrange
        const input = 'export const x = 1;';

        // Act
        const actual = parseLayerComment(input);

        // Assert
        expect(actual.layerName).toBeNull();
      });
    });

    context('空文字列の場合', () => {
      it('layerNameがnullになる', () => {
        // Arrange
        const input = '';

        // Act
        const actual = parseLayerComment(input);

        // Assert
        expect(actual.layerName).toBeNull();
      });
    });

    context('@layerの前にスペースがある場合', () => {
      it('layerNameが正しく抽出される', () => {
        // Arrange
        const input = '  //   @layer   presentation';

        // Act
        const actual = parseLayerComment(input);

        // Assert
        expect(actual.layerName).toBe('presentation');
      });
    });

    context('JSDoc末尾の */ が layerName に付かないこと', () => {
      it('layerName末尾に */ が含まれない', () => {
        // Arrange
        const input = '/** @layer domain */';

        // Act
        const actual = parseLayerComment(input);

        // Assert
        expect(actual.layerName).toBe('domain');
      });
    });
  });
});
