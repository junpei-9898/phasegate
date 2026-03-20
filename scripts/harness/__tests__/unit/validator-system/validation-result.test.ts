/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it } from 'vitest';
import { target, context, createValidatorId, createHarnessError } from '../../helpers/test-helpers.js';
import { ValidationResult } from '../../../validator-system/domain/value-objects/validation-result.js';

target('ValidationResult', () => {

  describe('pass()でValidationResultを生成する', () => {

    it('validatorId: L2-001, durationMs: 100でpass結果が生成されること (UT-VRS-001)', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = ValidationResult.pass(validatorId, 100);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toEqual([]);
      expect(actual.skipped).toBe(false);
      expect(actual.durationMs).toBe(100);
    });

    it('durationMs: 0（境界値）でValidationResultが生成されること (UT-VRS-004/UT-BND-005)', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = ValidationResult.pass(validatorId, 0);
      // Assert
      expect(actual.durationMs).toBe(0);
    });

    it('durationMs: 999999（大きな値）でValidationResultが生成されること (UT-BND-007)', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = ValidationResult.pass(validatorId, 999999);
      // Assert
      expect(actual.durationMs).toBe(999999);
    });
  });

  describe('fail()でValidationResultを生成する', () => {

    it('validatorId: L2-001, errors: [HarnessError], durationMs: 50でfail結果が生成されること (UT-VRS-002)', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      const errors = [createHarnessError()];
      // Act
      const actual = ValidationResult.fail(validatorId, errors, 50);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
      expect(actual.skipped).toBe(false);
    });
  });

  describe('skip()でValidationResultを生成する', () => {

    it('validatorId: L3-002でskip結果が生成されること (UT-VRS-003)', () => {
      // Arrange
      const validatorId = createValidatorId('L3-002');
      // Act
      const actual = ValidationResult.skip(validatorId);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toEqual([]);
      expect(actual.skipped).toBe(true);
      expect(actual.durationMs).toBe(0);
    });
  });

  context('不変条件違反の入力が渡された場合', () => {

    it('passed: trueかつerrorsに要素がある場合（矛盾状態）エラーがthrowされること (UT-VRS-005/INV-5)', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      const errors = [createHarnessError()];
      // Act
      const actual = () => ValidationResult.createRaw({ validatorId, passed: true, errors, skipped: false, durationMs: 100 });
      // Assert
      expect(actual).toThrow();
    });

    it('durationMs: -1（下限未満）を渡すとエラーがthrowされること (UT-VRS-006/UT-BND-006/INV-7)', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = () => ValidationResult.pass(validatorId, -1);
      // Assert
      expect(actual).toThrow();
    });
  });

  describe('skip()のskipped=true保証 (UT-VRS-007/INV-8)', () => {
    it('skip()で生成したValidationResultはpassed: trueかつerrors: []が保証されること', () => {
      // Arrange
      const validatorId = createValidatorId('L3-002');
      // Act
      const actual = ValidationResult.skip(validatorId);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toEqual([]);
    });
  });

  describe('hasErrors()でエラー有無を返す', () => {

    it('errors.length === 0のとき falseを返すこと (UT-VRS-008)', () => {
      // Arrange
      const sut = ValidationResult.pass(createValidatorId('L2-001'), 100);
      // Act
      const actual = sut.hasErrors();
      // Assert
      expect(actual).toBe(false);
    });

    it('errors.length > 0のとき trueを返すこと (UT-VRS-009)', () => {
      // Arrange
      const sut = ValidationResult.fail(createValidatorId('L2-001'), [createHarnessError()], 50);
      // Act
      const actual = sut.hasErrors();
      // Assert
      expect(actual).toBe(true);
    });
  });

  describe('errorCount()でエラー件数を返す', () => {

    it('errors.length === 3のとき 3を返すこと (UT-VRS-010)', () => {
      // Arrange
      const errors = [createHarnessError(), createHarnessError(), createHarnessError()];
      const sut = ValidationResult.fail(createValidatorId('L2-001'), errors, 50);
      // Act
      const actual = sut.errorCount();
      // Assert
      expect(actual).toBe(3);
    });
  });

  describe('equals()で同値比較を行う', () => {

    it('同一validatorId + 同一passed + 同一errorsの2つのValidationResultのequals()がtrueを返すこと (UT-VRS-011)', () => {
      // Arrange
      const vid = createValidatorId('L2-001');
      const a = ValidationResult.pass(vid, 100);
      const b = ValidationResult.pass(vid, 100);
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    it('passedが異なる2つのValidationResultのequals()がfalseを返すこと (UT-VRS-012)', () => {
      // Arrange
      const vid = createValidatorId('L2-001');
      const a = ValidationResult.pass(vid, 100);
      const b = ValidationResult.fail(vid, [createHarnessError()], 50);
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
