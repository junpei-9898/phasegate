/**
 * @layer application
 * @unit harness-error
 *
 * HarnessErrorContractMapper のユニットテスト
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { HarnessErrorContractMapper } from '../../../harness-error/application/mappers/harness-error-contract-mapper.js';
import { AdrRef } from '../../../harness-error/domain/value-objects/adr-ref.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
import { HarnessError } from '../../../harness-error/domain/value-objects/harness-error.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';

const createHarnessErrorEntity = (overrides: {
  code?: string;
  severity?: 'error' | 'warning';
  message?: string;
  suggestion?: string;
  adrRef?: string | null;
  fixExample?: string | null;
} = {}) =>
  new HarnessError({
    code: ErrorCode.create(overrides.code ?? 'L1-001'),
    severity: Severity.create(overrides.severity ?? 'error'),
    message: overrides.message ?? 'message',
    suggestion: overrides.suggestion ?? 'suggestion',
    adrRef:
      overrides.adrRef === null
        ? null
        : AdrRef.create(overrides.adrRef ?? 'ADR-001'),
    fixExample:
      overrides.fixExample === null
        ? null
        : FixExample.create(overrides.fixExample ?? 'const fixed = true;'),
  });

target('HarnessErrorContractMapper.toReadonlyContract', () => {
  describe('HarnessErrorを公開DTOへ投影する', () => {
    context('全フィールドを持つHarnessErrorの場合', () => {
      // IT-HE-047
      it('全フィールドが正しく投影されること', () => {
        // Arrange
        const sut = new HarnessErrorContractMapper();
        const harnessError = createHarnessErrorEntity({
          code: 'L1-001',
          severity: 'error',
          message: 'message',
          suggestion: 'suggestion',
          adrRef: 'ADR-001',
          fixExample: 'const fixed = true;',
        });

        // Act
        const actual = sut.toReadonlyContract(harnessError);

        // Assert
        expect(actual).toEqual({
          code: 'L1-001',
          severity: 'error',
          message: 'message',
          suggestion: 'suggestion',
          adr_ref: 'ADR-001',
          fix_example: 'const fixed = true;',
        });
      });
    });

    context('adrRefがnullの場合', () => {
      // IT-HE-048
      it('adr_refフィールドが省略されること', () => {
        // Arrange
        const sut = new HarnessErrorContractMapper();
        const harnessError = createHarnessErrorEntity({ adrRef: null });

        // Act
        const actual = sut.toReadonlyContract(harnessError);

        // Assert
        expect(actual.adr_ref).toBeUndefined();
      });
    });

    context('fixExampleがnullの場合', () => {
      // IT-HE-049
      it('fix_exampleフィールドが省略されること', () => {
        // Arrange
        const sut = new HarnessErrorContractMapper();
        const harnessError = createHarnessErrorEntity({ fixExample: null });

        // Act
        const actual = sut.toReadonlyContract(harnessError);

        // Assert
        expect(actual.fix_example).toBeUndefined();
      });
    });

  });
});
