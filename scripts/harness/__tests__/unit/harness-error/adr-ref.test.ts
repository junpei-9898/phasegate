// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { AdrRef } from '../../../harness-error/domain/value-objects/adr-ref.js';

const createAdrRef = (value = 'ADR-001') => AdrRef.create(value);

target('AdrRef', () => {
  target('create', () => {
    describe('有効なADR参照文字列からAdrRefを生成する', () => {
      // UT-HE-021
      it('ADR-001形式の文字列からAdrRefが生成されること', () => {
        // Arrange
        const input = 'ADR-001';

        // Act
        const actual = AdrRef.create(input);

        // Assert
        expect(actual.toString()).toBe('ADR-001');
      });
    });

    context('4桁が渡された場合', () => {
      // UT-HE-024
      it('エラーをthrowすること', () => {
        // Arrange
        const input = 'ADR-0001';

        // Act
        const actual = () => AdrRef.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('連番なしが渡された場合', () => {
      // UT-HE-025
      it('エラーをthrowすること', () => {
        // Arrange
        const input = 'ADR-';

        // Act
        const actual = () => AdrRef.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('形式に一致しない文字列が渡された場合', () => {
      // UT-HE-026
      it('エラーをthrowすること', () => {
        // Arrange
        const input = 'ADR-XYZ';

        // Act
        const actual = () => AdrRef.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('toString', () => {
    describe('元の文字列を返す', () => {
      // UT-HE-022
      it('生成時の文字列と同一の値を返すこと', () => {
        // Arrange
        const sut = createAdrRef('ADR-123');

        // Act
        const actual = sut.toString();

        // Assert
        expect(actual).toBe('ADR-123');
      });
    });
  });

  target('equals', () => {
    describe('同一値のAdrRef同士を比較する', () => {
      // UT-HE-023
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrRef('ADR-123');
        const other = createAdrRef('ADR-123');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
