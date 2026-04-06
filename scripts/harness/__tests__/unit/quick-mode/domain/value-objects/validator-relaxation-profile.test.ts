// @layer test
import { describe, expect, it } from 'vitest';
import { target, context, createValidatorRelaxationProfile } from '../../../../helpers/test-helpers.js';
import { ValidatorRelaxationProfile } from '../../../../../quick-mode/domain/value-objects/validator-relaxation-profile.js';

target('ValidatorRelaxationProfile', () => {
  target('createDefault', () => {
    describe('デフォルト緩和プロファイルを生成する', () => {
      // UT-VRP-001
      it('引数なしで呼び出した場合にlevelDependencyRelaxed=false、l1.all=true、l4.all=false、phaseExecution.twoPhaseRequired=falseのプロファイルが生成されること', () => {
        // Arrange（なし）
        // Act
        const actual = ValidatorRelaxationProfile.createDefault();
        // Assert
        expect(actual.levelDependencyRelaxed).toBe(false);
        expect(actual.l1.all).toBe(true);
        expect(actual.l4.all).toBe(false);
        expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
      });

      // UT-VRP-002
      it("デフォルトプロファイルのl2がmaintained=[L2-002, L2-003]、skipped=[L2-001]であること", () => {
        // Arrange（なし）
        // Act
        const actual = ValidatorRelaxationProfile.createDefault();
        // Assert
        expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-002', 'L2-003']));
        expect(actual.l2.maintained).toHaveLength(2);
        expect(actual.l2.skipped).toEqual(['L2-001']);
      });

      // UT-VRP-003
      it("デフォルトプロファイルのl3がmaintained=[L3-001]、skipped=[L3-002, L3-003, L3-004]であること", () => {
        // Arrange（なし）
        // Act
        const actual = ValidatorRelaxationProfile.createDefault();
        // Assert
        expect(actual.l3.maintained).toEqual(['L3-001']);
        expect(actual.l3.skipped).toEqual(
          expect.arrayContaining(['L3-002', 'L3-003', 'L3-004'])
        );
        expect(actual.l3.skipped).toHaveLength(3);
      });
    });
  });

  target('create', () => {
    describe('カスタム緩和プロファイルを生成する', () => {
      // UT-VRP-004
      it("l2.maintained∪l2.skippedが{L2-001, L2-002, L2-003}に一致する場合にValidatorRelaxationProfileが生成されること（INV-P5）", () => {
        // Arrange
        const input = {
          levelDependencyRelaxed: false as const,
          l1: { all: true as const },
          l2: { maintained: ['L2-002', 'L2-003'], skipped: ['L2-001'] },
          l3: { maintained: ['L3-001'], skipped: ['L3-002', 'L3-003', 'L3-004'] },
          l4: { all: false as const },
          phaseExecution: { twoPhaseRequired: false as const },
        };
        // Act
        const actual = ValidatorRelaxationProfile.create(input);
        // Assert
        expect(actual).toBeDefined();
      });

      // UT-VRP-005
      it("l2.maintained∪l2.skippedが{L2-001, L2-002, L2-003}に一致しない場合にエラーが発生すること（INV-P5違反）", () => {
        // Arrange
        const input = {
          levelDependencyRelaxed: false as const,
          l1: { all: true as const },
          l2: { maintained: ['L2-002'], skipped: ['L2-001'] }, // L2-003が欠落
          l3: { maintained: ['L3-001'], skipped: ['L3-002', 'L3-003', 'L3-004'] },
          l4: { all: false as const },
          phaseExecution: { twoPhaseRequired: false as const },
        };
        // Act
        const actual = () => ValidatorRelaxationProfile.create(input);
        // Assert
        expect(actual).toThrowError();
      });

      // UT-VRP-006
      it("l3.maintained∪l3.skippedが{L3-001, L3-002, L3-003, L3-004}に一致する場合にValidatorRelaxationProfileが生成されること（INV-P6）", () => {
        // Arrange
        const input = {
          levelDependencyRelaxed: false as const,
          l1: { all: true as const },
          l2: { maintained: ['L2-002', 'L2-003'], skipped: ['L2-001'] },
          l3: { maintained: ['L3-001', 'L3-002'], skipped: ['L3-003', 'L3-004'] },
          l4: { all: false as const },
          phaseExecution: { twoPhaseRequired: false as const },
        };
        // Act
        const actual = ValidatorRelaxationProfile.create(input);
        // Assert
        expect(actual).toBeDefined();
      });

      // UT-VRP-007
      it("l3.maintained∪l3.skippedが{L3-001, L3-002, L3-003, L3-004}に一致しない場合にエラーが発生すること（INV-P6違反）", () => {
        // Arrange
        const input = {
          levelDependencyRelaxed: false as const,
          l1: { all: true as const },
          l2: { maintained: ['L2-002', 'L2-003'], skipped: ['L2-001'] },
          l3: { maintained: ['L3-001'], skipped: ['L3-002', 'L3-003'] }, // L3-004が欠落
          l4: { all: false as const },
          phaseExecution: { twoPhaseRequired: false as const },
        };
        // Act
        const actual = () => ValidatorRelaxationProfile.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('isMaintained', () => {
    describe('指定ValidatorIdが維持対象かを判定する', () => {
      // UT-VRP-008
      it('L2-002が指定された場合にtrueが返ること', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile();
        // Act
        const actual = sut.isMaintained('L2-002');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-VRP-009
      it('L2-001が指定された場合にfalseが返ること（スキップ対象）', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile();
        // Act
        const actual = sut.isMaintained('L2-001');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('isSkipped', () => {
    describe('指定ValidatorIdがスキップ対象かを判定する', () => {
      // UT-VRP-010
      it('L2-001が指定された場合にtrueが返ること', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile();
        // Act
        const actual = sut.isSkipped('L2-001');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-VRP-011
      it('L3-001が指定された場合にfalseが返ること（維持対象）', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile();
        // Act
        const actual = sut.isSkipped('L3-001');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('2つのValidatorRelaxationProfileの値等価性を判定する', () => {
      // UT-VRP-012
      it('同一設定の2つのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile();
        const other = createValidatorRelaxationProfile();
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      // UT-VRP-013
      it('l2.maintainedが異なる2つのインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile(); // l2.maintained = [L2-002, L2-003]
        const other = ValidatorRelaxationProfile.create({
          l2: { maintained: ['L2-002', 'L2-003'], skipped: ['L2-001'] },
          l3: { maintained: ['L3-001', 'L3-002'], skipped: ['L3-003', 'L3-004'] }, // l3が違う
        });
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  // UT-VRP-014: INV-P1保護テスト
  it('INV-P1: createDefault()の戻り値のlevelDependencyRelaxedが常にfalseであること', () => {
    // Arrange（なし）
    // Act
    const actual = ValidatorRelaxationProfile.createDefault();
    // Assert
    expect(actual.levelDependencyRelaxed).toBe(false);
  });
});
