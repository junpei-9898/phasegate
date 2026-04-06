// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { MetadataValidationResult } from '../../../traceability-model/domain/value-objects/metadata-validation-result.ts';

const createHarnessError = (
  overrides: Partial<{
    code: string;
    severity: 'error' | 'warning';
    message: string;
    suggestion: string;
    fix_example: string;
  }> = {},
) =>
  Object.freeze({
    code: 'L2-002',
    severity: 'error' as const,
    message: 'metadata validation failed',
    suggestion: 'add metadata',
    fix_example: '@story-id H03-01',
    ...overrides,
  });

const createMetadataValidationResultSuccess = (
  warnings: readonly ReturnType<typeof createHarnessError>[] = Object.freeze([]),
) => MetadataValidationResult.success(Object.freeze({ warnings }));

const createMetadataValidationResultFailure = (
  errors: readonly ReturnType<typeof createHarnessError>[],
  warnings: readonly ReturnType<typeof createHarnessError>[] = Object.freeze([]),
) => MetadataValidationResult.failure(Object.freeze({ errors, warnings }));

target('MetadataValidationResult.success', () => {
  describe('成功結果を生成する', () => {
    // UT-TM-071
    context('warningsを指定しない場合', () => {
      it('valid=trueかつerrors空のインスタンスを返すこと', () => {
        // Arrange
        // Arrangeのみ

        // Act
        const actual = MetadataValidationResult.success();

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-072
    context('warningsを指定する場合', () => {
      it('valid=trueかつ指定warningsを保持すること', () => {
        // Arrange
        const warnings = Object.freeze([
          createHarnessError({ message: 'legacy metadata' }),
        ]);

        // Act
        const actual = MetadataValidationResult.success(Object.freeze({ warnings }));

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.warnings).toEqual(warnings);
      });
    });
  });
});

target('MetadataValidationResult.failure', () => {
  describe('失敗結果を生成する', () => {
    // UT-TM-073
    context('warningsを指定しない場合', () => {
      it('valid=falseかつ指定errorsを保持すること', () => {
        // Arrange
        const errors = Object.freeze([
          createHarnessError({ message: 'missing @unit' }),
        ]);

        // Act
        const actual = MetadataValidationResult.failure(Object.freeze({ errors }));

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors).toEqual(errors);
      });
    });

    // UT-TM-074
    context('warningsも指定する場合', () => {
      it('valid=falseかつerrorsとwarningsが両方保持されること', () => {
        // Arrange
        const errors = Object.freeze([
          createHarnessError({ message: 'missing @story' }),
        ]);
        const warnings = Object.freeze([
          createHarnessError({ message: 'legacy alias used' }),
        ]);

        // Act
        const actual = MetadataValidationResult.failure(
          Object.freeze({ errors, warnings }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors).toEqual(errors);
        expect(actual.warnings).toEqual(warnings);
      });
    });
  });
});

target('MetadataValidationResult.hasErrors', () => {
  describe('エラー有無を判定する', () => {
    // UT-TM-075
    context('errorsが非空の場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createMetadataValidationResultFailure(
          Object.freeze([createHarnessError()]),
        );

        // Act
        const actual = sut.hasErrors();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-076
    context('errorsが空の場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createMetadataValidationResultSuccess();

        // Act
        const actual = sut.hasErrors();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('MetadataValidationResult.hasWarnings', () => {
  describe('警告有無を判定する', () => {
    // UT-TM-077
    context('warningsが非空の場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createMetadataValidationResultSuccess(
          Object.freeze([createHarnessError()]),
        );

        // Act
        const actual = sut.hasWarnings();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-078
    context('warningsが空の場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createMetadataValidationResultSuccess();

        // Act
        const actual = sut.hasWarnings();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('MetadataValidationResult.equals', () => {
  describe('2つのMetadataValidationResultの等価性を判定する', () => {
    // UT-TM-079
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createMetadataValidationResultSuccess(
          Object.freeze([createHarnessError()]),
        );
        const other = createMetadataValidationResultSuccess(
          Object.freeze([createHarnessError()]),
        );

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
