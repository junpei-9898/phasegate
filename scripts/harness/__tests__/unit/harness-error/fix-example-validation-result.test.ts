// @layer test
// @story H06-02
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { FixExampleValidationResult } from '../../../harness-error/domain/value-objects/fix-example-validation-result.js';

const createValidationFailure = (
  validatorId = 'phase-gate',
  reason = '構文エラー',
  diagnostics = ['Unexpected token']
) => FixExampleValidationResult.failure(validatorId, reason, diagnostics);

target('FixExampleValidationResult', () => {
  target('success', () => {
    describe('検証成功の結果を生成する', () => {
      // UT-HE-032
      it('passedがtrueでreasonがnullの結果が生成されること', () => {
        // Arrange
        const validatorId = 'phase-gate';

        // Act
        const actual = FixExampleValidationResult.success(validatorId);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.reason).toBeNull();
      });

      // UT-HE-036
      it('diagnosticsが空配列であること', () => {
        // Arrange
        const validatorId = 'phase-gate';

        // Act
        const actual = FixExampleValidationResult.success(validatorId);

        // Assert
        expect(actual.diagnostics).toEqual([]);
      });
    });
  });

  target('failure', () => {
    describe('検証失敗の結果を生成する', () => {
      // UT-HE-033
      it('passedがfalseでreasonとdiagnosticsが設定されること', () => {
        // Arrange
        const validatorId = 'phase-gate';
        const reason = '構文エラー';
        const diagnostics = ['Unexpected token'];

        // Act
        const actual = FixExampleValidationResult.failure(
          validatorId,
          reason,
          diagnostics
        );

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.reason).toBe('構文エラー');
        expect(actual.diagnostics).toEqual(['Unexpected token']);
      });

      // UT-HE-034
      it('diagnosticsが1件以上あること', () => {
        // Arrange
        const validatorId = 'phase-gate';

        // Act
        const actual = FixExampleValidationResult.failure(
          validatorId,
          '構文エラー',
          ['Unexpected token']
        );

        // Assert
        expect(actual.diagnostics).toHaveLength(1);
      });
    });

    context('reasonが未指定の場合', () => {
      // UT-HE-037
      it('reasonが必須としてエラーになること', () => {
        // Arrange
        const validatorId = 'phase-gate';

        // Act
        const actual = () =>
          FixExampleValidationResult.failure(
            validatorId,
            '' as never,
            ['Unexpected token']
          );

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('diagnosticsが空配列の場合', () => {
      // UT-HE-038
      it('diagnosticsが1件以上でない制約違反としてエラーになること', () => {
        // Arrange
        const validatorId = 'phase-gate';

        // Act
        const actual = () =>
          FixExampleValidationResult.failure(validatorId, '構文エラー', []);

        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('equals', () => {
    describe('同一属性の結果同士を比較する', () => {
      // UT-HE-035
      it('trueを返すこと', () => {
        // Arrange
        const sut = createValidationFailure();
        const other = createValidationFailure();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
