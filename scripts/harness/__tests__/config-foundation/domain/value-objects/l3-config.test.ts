import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { L3Config } from '../../../../config-foundation/domain/value-objects/l3-config.js';
import { ConfigValidationError } from '../../../../config-foundation/domain/errors/config-validation-error.js';

target('L3Config', () => {
  describe('生成する', () => {
    context('coverageThresholdが0の場合', () => {
      it('生成できる', () => {
        // Arrange
        const coverageThreshold = 0;

        // Act
        const actual = new L3Config({ enabled: true, validators: [], coverageThreshold });

        // Assert
        expect(actual.coverageThreshold).toBe(0);
      });
    });

    context('coverageThresholdが100の場合', () => {
      it('生成できる', () => {
        // Arrange
        const coverageThreshold = 100;

        // Act
        const actual = new L3Config({ enabled: true, validators: [], coverageThreshold });

        // Assert
        expect(actual.coverageThreshold).toBe(100);
      });
    });

    context('coverageThresholdが50の場合', () => {
      it('生成できる', () => {
        // Arrange
        const coverageThreshold = 50;

        // Act
        const actual = new L3Config({ enabled: true, validators: [], coverageThreshold });

        // Assert
        expect(actual.coverageThreshold).toBe(50);
      });
    });

    context('coverageThresholdが下限未満の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const coverageThreshold = -1;

        // Act
        const actual = () => new L3Config({ enabled: true, validators: [], coverageThreshold });

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });

    context('coverageThresholdが上限超過の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const coverageThreshold = 101;

        // Act
        const actual = () => new L3Config({ enabled: true, validators: [], coverageThreshold });

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });
  });

  describe('等値性を判定する', () => {
    context('同じ属性を比較する場合', () => {
      it('等しい', () => {
        // Arrange
        const left = new L3Config({ enabled: true, validators: ['v1'], coverageThreshold: 90 });
        const right = new L3Config({ enabled: true, validators: ['v1'], coverageThreshold: 90 });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('coverageThresholdが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new L3Config({ enabled: true, validators: [], coverageThreshold: 90 });
        const right = new L3Config({ enabled: true, validators: [], coverageThreshold: 95 });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('coverage gate を判定する', () => {
    context('coverageThresholdが0より大きい場合', () => {
      it('trueを返す', () => {
        // Arrange
        const l3Config = new L3Config({ enabled: true, validators: [], coverageThreshold: 90 });

        // Act
        const actual = l3Config.hasCoverageGate();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('coverageThresholdが0の場合', () => {
      it('falseを返す', () => {
        // Arrange
        const l3Config = new L3Config({ enabled: true, validators: [], coverageThreshold: 0 });

        // Act
        const actual = l3Config.hasCoverageGate();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
