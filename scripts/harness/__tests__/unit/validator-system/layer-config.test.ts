/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it } from 'vitest';
import { target, createLayerConfig, createValidatorId } from '../../helpers/test-helpers.js';
import { LayerConfig } from '../../../validator-system/domain/value-objects/layer-config.js';

target('LayerConfig', () => {

  describe('有効なフィールドからLayerConfigを生成する', () => {

    it('全フィールド有効でLayerConfigが生成されること (UT-LCF-001)', () => {
      // Arrange & Act
      const actual = LayerConfig.create({
        layer: 'L2',
        enabled: true,
        validatorIds: ['L2-001'],
        thresholds: {},
        strictOnly: false,
        preset: 'standard',
      });
      // Assert
      expect(actual).toBeDefined();
    });

    it('enabled: falseでLayerConfigが生成されisValidatorEnabled()が全てfalseを返すこと (UT-LCF-002)', () => {
      // Arrange
      const sut = createLayerConfig({ enabled: false });
      // Act
      const actual = sut.isValidatorEnabled(createValidatorId('L2-001'));
      // Assert
      expect(actual).toBe(false);
    });

    it('thresholds: { coverageThreshold: 90 }でLayerConfigが生成されgetThreshold()が90を返すこと (UT-LCF-003)', () => {
      // Arrange
      const sut = createLayerConfig({ thresholds: { coverageThreshold: 90 } });
      // Act
      const actual = sut.getThreshold('coverageThreshold');
      // Assert
      expect(actual).toBe(90);
    });

    it('preset: strict, strictOnly: trueでLayerConfigが生成されること (UT-LCF-004)', () => {
      // Arrange & Act
      const actual = createLayerConfig({ preset: 'strict', strictOnly: true });
      // Assert
      expect(actual).toBeDefined();
    });
  });

  describe('isValidatorEnabled()でバリデータ有効状態を返す', () => {

    it('enabled: true, validatorIds: [L2-001]でL2-001を問い合わせるとtrueを返すこと (UT-LCF-005/INV-9)', () => {
      // Arrange
      const sut = createLayerConfig({ enabled: true, validatorIds: ['L2-001'] });
      const id = createValidatorId('L2-001');
      // Act
      const actual = sut.isValidatorEnabled(id);
      // Assert
      expect(actual).toBe(true);
    });

    it('enabled: true, validatorIds: [L2-001]でL2-002を問い合わせるとfalseを返すこと (UT-LCF-006)', () => {
      // Arrange
      const sut = createLayerConfig({ enabled: true, validatorIds: ['L2-001'] });
      const id = createValidatorId('L2-002');
      // Act
      const actual = sut.isValidatorEnabled(id);
      // Assert
      expect(actual).toBe(false);
    });

    it('enabled: falseでL2-001を問い合わせるとfalseを返すこと (UT-LCF-007/INV-8)', () => {
      // Arrange
      const sut = createLayerConfig({ enabled: false, validatorIds: ['L2-001'] });
      const id = createValidatorId('L2-001');
      // Act
      const actual = sut.isValidatorEnabled(id);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('getThreshold()で閾値を返す', () => {

    it('thresholds: { coverageThreshold: 90 }でcoverageThresholdを問い合わせると90を返すこと (UT-LCF-008)', () => {
      // Arrange
      const sut = createLayerConfig({ thresholds: { coverageThreshold: 90 } });
      // Act
      const actual = sut.getThreshold('coverageThreshold');
      // Assert
      expect(actual).toBe(90);
    });

    it('thresholds: {}でbundleSizeLimitを問い合わせるとnullを返すこと (UT-LCF-009)', () => {
      // Arrange
      const sut = createLayerConfig({ thresholds: {} });
      // Act
      const actual = sut.getThreshold('bundleSizeLimit');
      // Assert
      expect(actual).toBeNull();
    });

    it('thresholds: { coverageThreshold: 0 }（閾値下限）でLayerConfigが生成されること (UT-BND-008)', () => {
      // Arrange & Act
      const actual = createLayerConfig({ thresholds: { coverageThreshold: 0 } });
      // Assert
      expect(actual.getThreshold('coverageThreshold')).toBe(0);
    });

    it('thresholds: { coverageThreshold: 100 }（閾値上限）でLayerConfigが生成されること (UT-BND-009)', () => {
      // Arrange & Act
      const actual = createLayerConfig({ thresholds: { coverageThreshold: 100 } });
      // Assert
      expect(actual.getThreshold('coverageThreshold')).toBe(100);
    });
  });

  describe('equals()で同値比較を行う', () => {

    it('全フィールドが同一の2つのLayerConfigのequals()がtrueを返すこと (UT-LCF-010)', () => {
      // Arrange
      const a = createLayerConfig();
      const b = createLayerConfig();
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    it('enabledフィールドのみ異なる2つのLayerConfigのequals()がfalseを返すこと (UT-LCF-011)', () => {
      // Arrange
      const a = createLayerConfig({ enabled: true });
      const b = createLayerConfig({ enabled: false });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
