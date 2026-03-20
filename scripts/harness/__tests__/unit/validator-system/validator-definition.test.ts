/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it } from 'vitest';
import { target, context, createValidatorId, createValidationRule, createValidatorDefinition } from '../../helpers/test-helpers.js';
import { ValidatorDefinition } from '../../../validator-system/domain/value-objects/validator-definition.js';

target('ValidatorDefinition', () => {

  describe('有効なフィールドからValidatorDefinitionを生成する', () => {

    it('全フィールド有効でValidatorDefinitionが生成されること (UT-VDF-001)', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      const rule = createValidationRule();
      // Act
      const actual = ValidatorDefinition.create({
        validatorId,
        layer: 'L2',
        rules: [rule],
        enabledCondition: 'always',
        externalPolicyRef: 'PhaseGatePolicyPort',
      });
      // Assert
      expect(actual).toBeDefined();
      expect(actual.validatorId.value).toBe('L2-001');
    });

    it('externalPolicyRef: nullでValidatorDefinitionが生成されrequiresExternalPolicy()がfalseを返すこと (UT-VDF-004)', () => {
      // Arrange
      const validatorId = createValidatorId('L2-003');
      // Act
      const actual = ValidatorDefinition.create({
        validatorId,
        layer: 'L2',
        rules: [createValidationRule()],
        enabledCondition: 'always',
        externalPolicyRef: null,
      });
      // Assert
      expect(actual.requiresExternalPolicy()).toBe(false);
    });

    it('externalPolicyRef有りでValidatorDefinitionが生成されrequiresExternalPolicy()がtrueを返すこと (UT-VDF-005)', () => {
      // Arrange
      const validatorId = createValidatorId('L3-004');
      // Act
      const actual = ValidatorDefinition.create({
        validatorId,
        layer: 'L3',
        rules: [createValidationRule()],
        enabledCondition: 'always',
        externalPolicyRef: 'AcCoveragePolicyPort',
      });
      // Assert
      expect(actual.requiresExternalPolicy()).toBe(true);
    });
  });

  context('無効なフィールドが渡された場合', () => {

    it('rules: []（空配列）を渡すとエラーがthrowされること (UT-VDF-002/UT-BND-012)', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = () => ValidatorDefinition.create({
        validatorId,
        layer: 'L2',
        rules: [],
        enabledCondition: 'always',
        externalPolicyRef: null,
      });
      // Assert
      expect(actual).toThrow();
    });

    it('validatorId.getLayer()とlayerが不一致の場合エラーがthrowされること (UT-VDF-003)', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = () => ValidatorDefinition.create({
        validatorId,
        layer: 'L3',
        rules: [createValidationRule()],
        enabledCondition: 'always',
        externalPolicyRef: null,
      });
      // Assert
      expect(actual).toThrow();
    });
  });

  describe('requiresExternalPolicy()で外部ポリシー要否を返す', () => {

    it('externalPolicyRefが非nullのとき trueを返すこと (UT-VDF-006)', () => {
      // Arrange
      const sut = createValidatorDefinition({ externalPolicyRef: 'SomePolicyPort' });
      // Act
      const actual = sut.requiresExternalPolicy();
      // Assert
      expect(actual).toBe(true);
    });

    it('externalPolicyRefがnullのとき falseを返すこと (UT-VDF-007)', () => {
      // Arrange
      const sut = createValidatorDefinition({ externalPolicyRef: null });
      // Act
      const actual = sut.requiresExternalPolicy();
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('isStrictOnly()でstrictOnly条件を判定する', () => {

    it('enabledCondition: strictOnlyのとき trueを返すこと (UT-VDF-008)', () => {
      // Arrange
      const sut = createValidatorDefinition({ enabledCondition: 'strictOnly' });
      // Act
      const actual = sut.isStrictOnly();
      // Assert
      expect(actual).toBe(true);
    });

    it('enabledCondition: alwaysのとき falseを返すこと (UT-VDF-009)', () => {
      // Arrange
      const sut = createValidatorDefinition({ enabledCondition: 'always' });
      // Act
      const actual = sut.isStrictOnly();
      // Assert
      expect(actual).toBe(false);
    });

    it('enabledCondition: layerEnabledのとき falseを返すこと (UT-VDF-010)', () => {
      // Arrange
      const sut = createValidatorDefinition({ enabledCondition: 'layerEnabled' });
      // Act
      const actual = sut.isStrictOnly();
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('equals()で同値比較を行う', () => {

    it('同一validatorIdを持つ2つのValidatorDefinitionのequals()がtrueを返すこと (UT-VDF-011)', () => {
      // Arrange
      const a = createValidatorDefinition({ validatorId: createValidatorId('L2-001') });
      const b = createValidatorDefinition({ validatorId: createValidatorId('L2-001') });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    it('異なるvalidatorIdを持つ2つのValidatorDefinitionのequals()がfalseを返すこと (UT-VDF-012)', () => {
      // Arrange
      const a = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      const b = createValidatorDefinition({ validatorId: createValidatorId('L2-002'), layer: 'L2' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
