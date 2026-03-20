import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { PathsConfig } from '../../../config-foundation/domain/value-objects/paths-config.js';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';

target('PathsConfig', () => {
  describe('生成する', () => {
    // UT-CF-141
    context('相対パスを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          designDocs: 'docs/product',
          inceptionDocs: 'docs/inception',
        };

        // Act
        const actual = new PathsConfig(input);

        // Assert
        expect(actual.designDocs).toBe('docs/product');
        expect(actual.inceptionDocs).toBe('docs/inception');
      });
    });

    // UT-CF-142
    context('designDocsが空文字の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          designDocs: '',
          inceptionDocs: 'docs/inception',
        };

        // Act
        const actual = () => new PathsConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-143
    context('inceptionDocsが空文字の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          designDocs: 'docs/product',
          inceptionDocs: '',
        };

        // Act
        const actual = () => new PathsConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-144
    context('designDocsに~を含む場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          designDocs: '~/docs',
          inceptionDocs: 'docs/inception',
        };

        // Act
        const actual = () => new PathsConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-145
    context('inceptionDocsに$HOMEを含む場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          designDocs: 'docs/product',
          inceptionDocs: '$HOME/docs',
        };

        // Act
        const actual = () => new PathsConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });
  });

  describe('等値性を判定する', () => {
    // UT-CF-146
    context('同じパスを比較する場合', () => {
      it('等しい', () => {
        // Arrange
        const props = {
          designDocs: 'docs/product',
          inceptionDocs: 'docs/inception',
        };
        const left = new PathsConfig(props);
        const right = new PathsConfig(props);

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-147
    context('designDocsが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new PathsConfig({
          designDocs: 'docs/product',
          inceptionDocs: 'docs/inception',
        });
        const right = new PathsConfig({
          designDocs: 'docs/other',
          inceptionDocs: 'docs/inception',
        });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
