/**
 * @layer test
 * @unit validator-system
 * @story H08-01
 * @work-item-id WI-116 / WI-132 / WI-133 / WI-136 / WI-137 / WI-138 / WI-156
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ValidatorId, InvalidValidatorIdError } from '../../../validator-system/domain/value-objects/validator-id.js';

target('ValidatorId', () => {

  describe('有効な値からValidatorIdを生成する', () => {

    it('L2-001を渡すとValidatorIdが生成されること (UT-VID-001)', () => {
      // Arrange
      const input = 'L2-001';
      // Act
      const actual = ValidatorId.create(input);
      // Assert
      expect(actual.value).toBe('L2-001');
    });

    it('L3-003を渡すとValidatorIdが生成されること (UT-VID-002)', () => {
      // Arrange
      const input = 'L3-003';
      // Act
      const actual = ValidatorId.create(input);
      // Assert
      expect(actual.value).toBe('L3-003');
    });

    it('L4-006（有効範囲最大値）を渡すとValidatorIdが生成されること (UT-VID-003/UT-BND-002)', () => {
      // Arrange
      const input = 'L4-006';
      // Act
      const actual = ValidatorId.create(input);
      // Assert
      expect(actual.value).toBe('L4-006');
    });

    it('L2-001（有効範囲最小値）を渡すとValidatorIdが生成されること (UT-VID-004/UT-BND-001)', () => {
      // Arrange
      const input = 'L2-001';
      // Act
      const actual = ValidatorId.create(input);
      // Assert
      expect(actual.value).toBe('L2-001');
    });

    it('L2-014を渡すとwork-item-status-stalenessとして生成されること', () => {
      const actual = ValidatorId.create('L2-014');

      expect(actual.value).toBe('L2-014');
      expect(actual.getName()).toBe('work-item-status-staleness');
    });

    it('L2-015を渡すとcontract-traceability-coverageとして生成されること', () => {
      const actual = ValidatorId.create('L2-015');

      expect(actual.value).toBe('L2-015');
      expect(actual.getName()).toBe('contract-traceability-coverage');
    });
  });

  context('無効な値が渡された場合', () => {

    it('小文字のl2-001を渡すとInvalidValidatorIdErrorをthrowすること (UT-VID-005)', () => {
      // Arrange
      const input = 'l2-001';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    it('L1-001（L1は無効レイヤー）を渡すとInvalidValidatorIdErrorをthrowすること (UT-VID-006)', () => {
      // Arrange
      const input = 'L1-001';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    it('L5-001（L5は無効レイヤー）を渡すとInvalidValidatorIdErrorをthrowすること (UT-VID-007)', () => {
      // Arrange
      const input = 'L5-001';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    it('L2-004（L2レイヤー範囲外）を渡すとInvalidValidatorIdErrorをthrowすること (UT-VID-008)', () => {
      // Arrange
      const input = 'L2-004';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    it('L2-000（連番下限未満）を渡すとInvalidValidatorIdErrorをthrowすること (UT-VID-009/UT-BND-004)', () => {
      // Arrange
      const input = 'L2-000';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    it('空文字を渡すとInvalidValidatorIdErrorをthrowすること (UT-VID-010)', () => {
      // Arrange
      const input = '';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    it('桁数不足のL2-01を渡すとInvalidValidatorIdErrorをthrowすること (UT-VID-011)', () => {
      // Arrange
      const input = 'L2-01';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    it('桁数超過のL2-0001を渡すとInvalidValidatorIdErrorをthrowすること (UT-VID-012)', () => {
      // Arrange
      const input = 'L2-0001';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    it('L4-008（有効範囲超過）を渡すとInvalidValidatorIdErrorをthrowすること (UT-BND-003)', () => {
      // Arrange
      // WI-222 (HF2-05) で L4-007 (ac-level-traceability) を有効 ID に追加したため、
      // 範囲超過の境界値は L4-008 に更新した。
      const input = 'L4-008';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });
  });

  describe('getLayer()でレイヤー文字列を返す', () => {

    it('L2-001のValidatorIdからL2を返すこと (UT-VID-013)', () => {
      // Arrange
      const sut = ValidatorId.create('L2-001');
      // Act
      const actual = sut.getLayer();
      // Assert
      expect(actual).toBe('L2');
    });

    it('L4-003のValidatorIdからL4を返すこと (UT-VID-014)', () => {
      // Arrange
      const sut = ValidatorId.create('L4-003');
      // Act
      const actual = sut.getLayer();
      // Assert
      expect(actual).toBe('L4');
    });
  });

  describe('getName()でバリデータ名を返す', () => {

    it('L2-001のValidatorIdからphase-gateを返すこと (UT-VID-015)', () => {
      // Arrange
      const sut = ValidatorId.create('L2-001');
      // Act
      const actual = sut.getName();
      // Assert
      expect(actual).toBe('phase-gate');
    });

    it('L3-003のValidatorIdからcoverageを返すこと (UT-VID-016)', () => {
      // Arrange
      const sut = ValidatorId.create('L3-003');
      // Act
      const actual = sut.getName();
      // Assert
      expect(actual).toBe('coverage');
    });

    it('L4-001のValidatorIdからdrift-detectを返すこと (UT-VID-017)', () => {
      // Arrange
      const sut = ValidatorId.create('L4-001');
      // Act
      const actual = sut.getName();
      // Assert
      expect(actual).toBe('drift-detect');
    });

    it('L4-004のValidatorIdからdoc-freshnessを返すこと', () => {
      // Arrange
      const sut = ValidatorId.create('L4-004');
      // Act
      const actual = sut.getName();
      // Assert
      expect(actual).toBe('doc-freshness');
    });

    it('L4-005のValidatorIdからpointer-validationを返すこと', () => {
      // Arrange
      const sut = ValidatorId.create('L4-005');
      // Act
      const actual = sut.getName();
      // Assert
      expect(actual).toBe('pointer-validation');
    });

    it('L4-006のValidatorIdからskill-catalog-driftを返すこと', () => {
      // Arrange
      const sut = ValidatorId.create('L4-006');
      // Act
      const actual = sut.getName();
      // Assert
      expect(actual).toBe('skill-catalog-drift');
    });
  });

  describe('toString()でID文字列を返す', () => {

    it('L2-002のValidatorIdのtoString()がL2-002を返すこと (UT-VID-018)', () => {
      // Arrange
      const sut = ValidatorId.create('L2-002');
      // Act
      const actual = sut.toString();
      // Assert
      expect(actual).toBe('L2-002');
    });
  });

  describe('equals()で同値比較を行う', () => {

    it('同一IDの2つのValidatorIdのequals()がtrueを返すこと (UT-VID-019)', () => {
      // Arrange
      const a = ValidatorId.create('L2-001');
      const b = ValidatorId.create('L2-001');
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    it('異なるIDのValidatorId同士のequals()がfalseを返すこと (UT-VID-020)', () => {
      // Arrange
      const a = ValidatorId.create('L2-001');
      const b = ValidatorId.create('L2-002');
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('fromName()でバリデータ名からValidatorIdを生成する', () => {

    it('phase-gateを渡すとL2-001相当のValidatorIdが返ること (UT-VID-021)', () => {
      // Arrange
      const name = 'phase-gate';
      // Act
      const actual = ValidatorId.fromName(name);
      // Assert
      expect(actual.value).toBe('L2-001');
    });

    it('dead-codeを渡すとL4-003相当のValidatorIdが返ること (UT-VID-022)', () => {
      // Arrange
      const name = 'dead-code';
      // Act
      const actual = ValidatorId.fromName(name);
      // Assert
      expect(actual.value).toBe('L4-003');
    });

    context('未知のバリデータ名が渡された場合', () => {
      it('InvalidValidatorIdErrorをthrowすること (UT-VID-023)', () => {
        // Arrange
        const name = 'unknown-validator';
        // Act
        const actual = () => ValidatorId.fromName(name);
        // Assert
        expect(actual).toThrow(InvalidValidatorIdError);
      });
    });
  });
});
