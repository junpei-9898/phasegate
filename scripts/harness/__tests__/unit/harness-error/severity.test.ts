import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';

const createSeverity = (value: 'error' | 'warning' = 'warning') =>
  Severity.create(value);

target('Severity', () => {

  target('isHigherThan', () => {
    describe('severity間のrank比較を行う', () => {
      // UT-HE-015
      it('errorのrankがwarningより高いことを示すtrueを返すこと', () => {
        // Arrange
        const sut = createSeverity('error');
        const other = createSeverity('warning');

        // Act
        const actual = sut.isHigherThan(other);

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-016
      it('warningのrankがerrorより低いことを示すfalseを返すこと', () => {
        // Arrange
        const sut = createSeverity('warning');
        const other = createSeverity('error');

        // Act
        const actual = sut.isHigherThan(other);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('同一severity同士を比較する', () => {
      // UT-HE-017
      it('trueを返すこと', () => {
        // Arrange
        const sut = createSeverity('warning');
        const other = createSeverity('warning');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
