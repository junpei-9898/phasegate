import { expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AdrId } from '../../../adr-foundation/domain/value-objects/adr-id.js';

const createAdrId = (value = '001'): AdrId => AdrId.create(value);

target('AdrId', () => {

  target('toNumber', () => {
    // UT-AF-045
    context('正常なADR識別子を保持している場合', () => {
      it('数値へ変換できること', () => {
        // Arrange
        const sut = createAdrId('001');

        // Act
        const actual = sut.toNumber();

        // Assert
        expect(actual).toBe(1);
      });
    });
  });

  target('toAdrRef', () => {
    // UT-AF-046
    context('正常なADR識別子を保持している場合', () => {
      it('ADR参照形式へ変換できること', () => {
        // Arrange
        const sut = createAdrId('001');

        // Act
        const actual = sut.toAdrRef();

        // Assert
        expect(actual).toBe('ADR-001');
      });
    });
  });

  target('equals', () => {
    // UT-AF-047
    context('同じ識別子同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrId('001');
        const other = createAdrId('001');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-AF-048
    context('異なる識別子同士を比較する場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createAdrId('001');
        const other = createAdrId('002');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('compare', () => {
    // UT-AF-049
    context('異なる識別子同士を比較する場合', () => {
      it('昇順ソート契約に従った値を返すこと', () => {
        // Arrange
        const sut = createAdrId('001');
        const other = createAdrId('002');

        // Act
        const actual = sut.compare(other);

        // Assert
        expect(actual).toBeLessThan(0);
      });
    });
  });
});
