// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers.js';
import { ChangeCategory } from '../../../../../quick-mode/domain/value-objects/change-category.js';

target('ChangeCategory', () => {
  target('fromString', () => {
    describe('文字列からChangeCategoryを生成する', () => {
      // UT-CC-001
      it("正規7値（'bugfix'/'docs'/'test'/'config'/'feature'/'domain'/'api'）が渡された場合に対応するChangeCategoryが生成されること", () => {
        // Arrange
        const inputs = ['bugfix', 'docs', 'test', 'config', 'feature', 'domain', 'api'];
        // Act
        const actuals = inputs.map((v) => ChangeCategory.fromString(v));
        // Assert
        actuals.forEach((actual, i) => {
          expect(actual.toString()).toBe(inputs[i]);
        });
      });

      // UT-CC-002
      it("大文字（'BUGFIX'）が渡された場合に大文字小文字を正規化してChangeCategoryが生成されること", () => {
        // Arrange
        const input = 'BUGFIX';
        // Act
        const actual = ChangeCategory.fromString(input);
        // Assert
        expect(actual.toString()).toBe('bugfix');
      });
    });

    context('定義外の文字列が渡された場合', () => {
      // UT-CC-003
      it('UnknownChangeCategoryErrorが発生すること', () => {
        // Arrange
        const input = 'unknown-category';
        // Act
        const actual = () => ChangeCategory.fromString(input);
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('isQuickModeRejectable', () => {
    describe('Quick Mode拒否対象カテゴリかを判定する', () => {
      // UT-CC-004
      it("'domain'の場合にtrueが返ること", () => {
        // Arrange
        const sut = ChangeCategory.fromString('domain');
        // Act
        const actual = sut.isQuickModeRejectable();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CC-005
      it("'api'の場合にtrueが返ること", () => {
        // Arrange
        const sut = ChangeCategory.fromString('api');
        // Act
        const actual = sut.isQuickModeRejectable();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CC-006
      it("'feature'の場合にtrueが返ること", () => {
        // Arrange
        const sut = ChangeCategory.fromString('feature');
        // Act
        const actual = sut.isQuickModeRejectable();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CC-007
      it("'bugfix'の場合にfalseが返ること", () => {
        // Arrange
        const sut = ChangeCategory.fromString('bugfix');
        // Act
        const actual = sut.isQuickModeRejectable();
        // Assert
        expect(actual).toBe(false);
      });

      // UT-CC-008
      it("'docs'/'test'/'config'の場合にfalseが返ること", () => {
        // Arrange
        const inputs = ['docs', 'test', 'config'].map((v) => ChangeCategory.fromString(v));
        // Act / Assert
        inputs.forEach((sut) => {
          const actual = sut.isQuickModeRejectable();
          expect(actual).toBe(false);
        });
      });
    });
  });

  target('toString', () => {
    describe('ChangeCategoryを文字列に変換する', () => {
      // UT-CC-009
      it("'bugfix'のChangeCategoryの場合に'bugfix'が返ること", () => {
        // Arrange
        const sut = ChangeCategory.fromString('bugfix');
        // Act
        const actual = sut.toString();
        // Assert
        expect(actual).toBe('bugfix');
      });
    });
  });

  target('equals', () => {
    describe('2つのChangeCategoryの等価性を判定する', () => {
      // UT-CC-010
      it('同一値の2つのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = ChangeCategory.fromString('bugfix');
        const other = ChangeCategory.fromString('bugfix');
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
