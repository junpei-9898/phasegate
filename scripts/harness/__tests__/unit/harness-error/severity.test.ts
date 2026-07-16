// @layer test
// @story H06-03
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

  target('生成後の不変性', () => {
    context('createで生成したSeverityへ再代入を試みた場合', () => {
      // UT-HE-129
      // @ac H06-03-2
      // logical_design.md §2.2.2「Object.freeze() によりランタイム変更を禁止する」/
      // domain_model.md Severity「生成後は不変」を検証する。凍結済みインスタンスへの
      // value/rank 再代入が反映されず、元の値が保持されることを固定化する。
      it('凍結されておりvalue再代入が反映されないこと', () => {
        // Arrange
        const sut = createSeverity('error');

        // Act
        const actual = (): void => {
          (sut as { value: 'error' | 'warning' }).value = 'warning';
        };

        // Assert
        expect(Object.isFrozen(sut)).toBe(true);
        expect(actual).toThrow(TypeError);
        expect(sut.value).toBe('error');
      });

      // UT-HE-130
      // @ac H06-03-2
      // 比較用内部値 rank も凍結後に改変できないことを検証し、severity 権限契約
      // （rank ベースの格下げ判定）の基盤が生成後に破壊されないことを保証する。
      it('凍結されておりrank再代入が反映されないこと', () => {
        // Arrange
        const sut = createSeverity('error');

        // Act
        const actual = (): void => {
          (sut as { rank: number }).rank = 1;
        };

        // Assert
        expect(actual).toThrow(TypeError);
        expect(sut.rank).toBe(2);
      });
    });
  });
});
