/**
 * @layer domain
 * @unit harness-error
 *
 * HarnessError 中心モデルのユニットテスト
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';
import { AdrRef } from '../../../harness-error/domain/value-objects/adr-ref.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
import { HarnessError } from '../../../harness-error/domain/value-objects/harness-error.js';
import type { HarnessErrorProps } from '../../../harness-error/domain/value-objects/harness-error.js';

const createErrorCode = (value = 'L1-001') => ErrorCode.create(value);
const createSeverity = (value: 'error' | 'warning' = 'warning') => Severity.create(value);
const createAdrRef = (value = 'ADR-001') => AdrRef.create(value);
const createFixExample = (value = 'const repaired = true;') => FixExample.create(value);

const buildHarnessError = (overrides: Partial<HarnessErrorProps> = {}) =>
  new HarnessError({
    code: createErrorCode(),
    severity: createSeverity('warning'),
    message: 'エラー内容',
    suggestion: '修正案',
    adrRef: null,
    fixExample: null,
    ...overrides,
  });

target('HarnessError', () => {
  target('equals', () => {
    describe('HarnessError同士を比較する', () => {
      // UT-HE-053
      it('全フィールドが一致する場合にtrueを返すこと', () => {
        // Arrange
        const sut = buildHarnessError({
          adrRef: createAdrRef('ADR-010'),
          fixExample: createFixExample('const fixedValue = 1;'),
        });
        const other = buildHarnessError({
          adrRef: createAdrRef('ADR-010'),
          fixExample: createFixExample('const fixedValue = 1;'),
        });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-060
      it('全必須属性が一致する場合にtrueを返すこと', () => {
        // Arrange
        const sut = buildHarnessError();
        const other = buildHarnessError();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  target('hasAdrRef', () => {
    describe('adrRef保持有無を返す', () => {
      // UT-HE-054
      it('adrRefを持つ場合にtrueを返すこと', () => {
        // Arrange
        const sut = buildHarnessError({ adrRef: createAdrRef('ADR-010') });

        // Act
        const actual = sut.hasAdrRef();

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-055
      it('adrRefを持たない場合にfalseを返すこと', () => {
        // Arrange
        const sut = buildHarnessError({ adrRef: null });

        // Act
        const actual = sut.hasAdrRef();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('hasFixExample', () => {
    describe('fixExample保持有無を返す', () => {
      // UT-HE-056
      it('fixExampleを持つ場合にtrueを返すこと', () => {
        // Arrange
        const sut = buildHarnessError({ fixExample: createFixExample('const fixedValue = 1;') });

        // Act
        const actual = sut.hasFixExample();

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-057
      it('fixExampleを持たない場合にfalseを返すこと', () => {
        // Arrange
        const sut = buildHarnessError({ fixExample: null });

        // Act
        const actual = sut.hasFixExample();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('toContract', () => {
    describe('Shared Kernel公開DTOへ変換する', () => {
      // UT-HE-058
      it('全フィールドが正しく投影されること', () => {
        // Arrange
        const sut = buildHarnessError({
          code: createErrorCode('L2-010'),
          severity: createSeverity('error'),
          message: '設計順序違反',
          suggestion: '設計書を確認する',
          adrRef: createAdrRef('ADR-010'),
          fixExample: createFixExample('const fixedValue = 1;'),
        });

        // Act
        const actual = sut.toContract();

        // Assert
        expect(actual).toEqual({
          code: 'L2-010',
          severity: 'error',
          message: '設計順序違反',
          suggestion: '設計書を確認する',
          adr_ref: 'ADR-010',
          fix_example: 'const fixedValue = 1;',
        });
      });

    });
  });
});
