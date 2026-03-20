import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { toHarnessErrors } from '../../../adr-foundation/application/mappers/adr-validation-to-harness-error-mapper.js';
import type { AdrValidationResultDto } from '../../../adr-foundation/application/dto/adr-validation-result-dto.js';

const createValidationResultDto = (
  overrides: Partial<AdrValidationResultDto> = {},
): AdrValidationResultDto => ({
  adrRef: overrides.adrRef ?? 'ADR-010',
  valid: overrides.valid ?? false,
  violations:
    overrides.violations ?? [
      {
        field: 'superseded_by',
        code: 'ADR-SUPERSEDED-TARGET-NOT-FOUND',
        message: 'superseded_by の参照先ADRが存在しません',
      },
    ],
  harnessErrors: overrides.harnessErrors ?? [],
});

target('toHarnessErrors', () => {
  describe('AdrValidationResultDtoからHarnessError互換エラー配列へ変換する', () => {
    // IT-AF-051
    context('違反ありの検証結果を変換した場合', () => {
      it('HarnessError互換のエラー配列が生成される', () => {
        // Arrange
        const validationResult = createValidationResultDto();

        // Act
        const actual = toHarnessErrors(validationResult);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]).toMatchObject({
          code: 'ADR-SUPERSEDED-TARGET-NOT-FOUND',
          message: 'superseded_by の参照先ADRが存在しません',
        });
      });
    });

    // IT-AF-052
    context('違反ありの検証結果を変換した場合', () => {
      it('adr_refがHarnessError内に正しく埋め込まれる', () => {
        // Arrange
        const validationResult = createValidationResultDto({ adrRef: 'ADR-010' });

        // Act
        const actual = toHarnessErrors(validationResult);

        // Assert
        expect(actual[0]?.metadata.adr_ref).toBe('ADR-010');
      });
    });

    // IT-AF-053
    context('違反なしの検証結果を変換した場合', () => {
      it('空配列が返される', () => {
        // Arrange
        const validationResult = createValidationResultDto({
          valid: true,
          violations: [],
          harnessErrors: [],
        });

        // Act
        const actual = toHarnessErrors(validationResult);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    // IT-AF-054
    context('複数違反がある検証結果を変換した場合', () => {
      it('それぞれの違反が個別のHarnessErrorへ変換される', () => {
        // Arrange
        const validationResult = createValidationResultDto({
          violations: [
            {
              field: 'superseded_by',
              code: 'ADR-SUPERSEDED-TARGET-NOT-FOUND',
              message: 'superseded_by の参照先ADRが存在しません',
            },
            {
              field: 'body',
              code: 'ADR-BODY-SECTION-REQUIRED',
              message: 'ADR本文の必須セクションが不足しています',
            },
          ],
        });

        // Act
        const actual = toHarnessErrors(validationResult);

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual.map((error) => error.code)).toEqual([
          'ADR-SUPERSEDED-TARGET-NOT-FOUND',
          'ADR-BODY-SECTION-REQUIRED',
        ]);
      });
    });
  });
});
