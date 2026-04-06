// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  ArchgateEntry,
  InvalidArchgateErrorCodeError,
  InvalidArchgateValidatorIdError,
} from '../../../adr-foundation/domain/value-objects/archgate-entry.js';

const createArchgateEntry = (
  overrides?: Partial<{ validator_id: string; error_code: string }>,
): ArchgateEntry =>
  ArchgateEntry.create({
    validator_id: overrides?.validator_id ?? 'phase-gate',
    error_code: overrides?.error_code ?? 'L1-001',
  });

target('ArchgateEntry', () => {
  target('create', () => {
    // UT-AF-090
    context('妥当なvalidator_idとerror_codeを渡す場合', () => {
      it('エントリが生成されること', () => {
        // Arrange
        const input = { validator_id: 'phase-gate', error_code: 'L1-001' };

        // Act
        const actual = ArchgateEntry.create(input);

        // Assert
        expect(actual.validatorId).toBe('phase-gate');
        expect(actual.errorCode).toBe('L1-001');
      });
    });

    // UT-AF-091, UT-AF-092, UT-AF-093
    context('validator_id形式が不正な場合', () => {
      it('validator_id形式エラーが発生すること', () => {
        // Arrange
        const inputs = ['', 'phaseGate', 'Phase-Gate'];

        // Act
        const actual = () => {
          for (const input of inputs) {
            ArchgateEntry.create({ validator_id: input, error_code: 'L1-001' });
          }
        };

        // Assert
        expect(actual).toThrowError(InvalidArchgateValidatorIdError);
      });
    });

    // UT-AF-094, UT-AF-095, UT-AF-096
    context('error_code形式が不正な場合', () => {
      it('error_code形式エラーが発生すること', () => {
        // Arrange
        const inputs = ['L5-001', 'L1-01', 'X1-001'];

        // Act
        const actual = () => {
          for (const input of inputs) {
            ArchgateEntry.create({ validator_id: 'phase-gate', error_code: input });
          }
        };

        // Assert
        expect(actual).toThrowError(InvalidArchgateErrorCodeError);
      });
    });
  });

  target('matchesValidatorId', () => {
    // UT-AF-097
    context('一致するvalidator_idを判定する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createArchgateEntry({ validator_id: 'phase-gate' });

        // Act
        const actual = sut.matchesValidatorId('phase-gate');

        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  target('matchesErrorCode', () => {
    // UT-AF-098
    context('一致するerror_codeを判定する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createArchgateEntry({ error_code: 'L1-001' });

        // Act
        const actual = sut.matchesErrorCode('L1-001');

        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  target('equals', () => {
    // UT-AF-099
    context('同じ内容のエントリを比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createArchgateEntry();
        const other = createArchgateEntry();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
