// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';

const createFixExample = (value = 'const repaired = true;') =>
  FixExample.create(value);

target('FixExample', () => {
  target('create', () => {
    describe('有効なコード片文字列からFixExampleを生成する', () => {
      // UT-HE-027
      it('有効なコード片文字列からFixExampleが生成されること', () => {
        // Arrange
        const input = 'const repaired = true;';

        // Act
        const actual = FixExample.create(input);

        // Assert
        expect(actual.toString()).toBe('const repaired = true;');
      });
    });

    context('空文字が渡された場合', () => {
      // UT-HE-030
      it('エラーをthrowすること', () => {
        // Arrange
        const input = '';

        // Act
        const actual = () => FixExample.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('空白のみの文字列が渡された場合', () => {
      // UT-HE-031
      it('trim後に空文字としてエラーをthrowすること', () => {
        // Arrange
        const input = '   ';

        // Act
        const actual = () => FixExample.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('toString', () => {
    describe('元の文字列を返す', () => {
      // UT-HE-028
      it('生成時の文字列と同一の値を返すこと', () => {
        // Arrange
        const sut = createFixExample('const value = 1;');

        // Act
        const actual = sut.toString();

        // Assert
        expect(actual).toBe('const value = 1;');
      });
    });
  });

  target('equals', () => {
    describe('同一値のFixExample同士を比較する', () => {
      // UT-HE-029
      it('trueを返すこと', () => {
        // Arrange
        const sut = createFixExample('const value = 1;');
        const other = createFixExample('const value = 1;');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
