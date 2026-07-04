// @layer test
// @story H06-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';

const createErrorCode = (value = 'L1-001') => ErrorCode.create(value);

target('ErrorCode', () => {
  target('create', () => {
    describe('有効なエラーコード文字列からErrorCodeを生成する', () => {
      // UT-HE-001
      it('L0-001形式の文字列からErrorCodeが生成されること', () => {
        // Arrange
        const input = 'L0-001';

        // Act
        const actual = ErrorCode.create(input);

        // Assert
        expect(actual.toString()).toBe('L0-001');
        expect(actual.layer).toBe(0);
      });

      // UT-HE-002
      it('L4-999形式の文字列からErrorCodeが生成されること', () => {
        // Arrange
        const input = 'L4-999';

        // Act
        const actual = ErrorCode.create(input);

        // Assert
        expect(actual.toString()).toBe('L4-999');
        expect(actual.layer).toBe(4);
      });

      // UT-HE-003
      it('4桁連番の文字列からErrorCodeが生成されること', () => {
        // Arrange
        const input = 'L0-0001';

        // Act
        const actual = ErrorCode.create(input);

        // Assert
        expect(actual.toString()).toBe('L0-0001');
      });
    });

  });

  target('layer', () => {
    describe('レイヤー識別子を返す', () => {
      // UT-HE-004
      it('layerプロパティがレイヤー識別子を返すこと', () => {
        // Arrange
        const sut = createErrorCode('L3-123');

        // Act
        const actual = sut.layer;

        // Assert
        expect(actual).toBe(3);
      });
    });
  });

  target('toString', () => {
    describe('元の文字列表現を返す', () => {
      // UT-HE-005
      it('生成時の文字列と同一の値を返すこと', () => {
        // Arrange
        const sut = createErrorCode('L2-101');

        // Act
        const actual = sut.toString();

        // Assert
        expect(actual).toBe('L2-101');
      });
    });
  });

  target('equals', () => {
    describe('ErrorCode同士を比較する', () => {
      // UT-HE-006
      it('同一値の場合にtrueを返すこと', () => {
        // Arrange
        const sut = createErrorCode('L1-001');
        const other = createErrorCode('L1-001');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-007
      it('異なる値の場合にfalseを返すこと', () => {
        // Arrange
        const sut = createErrorCode('L1-001');
        const other = createErrorCode('L1-002');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
