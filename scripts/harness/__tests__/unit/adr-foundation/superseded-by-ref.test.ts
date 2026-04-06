// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AdrId } from '../../../adr-foundation/domain/value-objects/adr-id.js';
import { SupersededByRef } from '../../../adr-foundation/domain/value-objects/superseded-by-ref.js';

const createAdrId = (value = '002'): AdrId => AdrId.create(value);
const createSupersededByRef = (value = '002'): SupersededByRef =>
  SupersededByRef.create(createAdrId(value));

target('SupersededByRef', () => {
  target('toAdrRef', () => {
    // UT-AF-113
    context('正常な参照を保持している場合', () => {
      it('ADR参照形式を返すこと', () => {
        // Arrange
        const sut = createSupersededByRef('002');

        // Act
        const actual = sut.toAdrRef();

        // Assert
        expect(actual).toBe('ADR-002');
      });
    });
  });

  target('equals', () => {
    // UT-AF-114
    context('同じ参照を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createSupersededByRef('002');
        const other = createSupersededByRef('002');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-AF-115
    context('異なる参照を比較する場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createSupersededByRef('002');
        const other = createSupersededByRef('003');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('adrId', () => {
    // UT-AF-116
    context('内部のAdrIdへアクセスする場合', () => {
      it('保持しているADR参照を取得できること', () => {
        // Arrange
        const sut = createSupersededByRef('002');

        // Act
        const actual = sut.adrId.toAdrRef();

        // Assert
        expect(actual).toBe('ADR-002');
      });
    });
  });
});
