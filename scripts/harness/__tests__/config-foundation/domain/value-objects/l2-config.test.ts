// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { L2Config } from '../../../../config-foundation/domain/value-objects/l2-config.js';
import { ConfigValidationError } from '../../../../config-foundation/domain/errors/config-validation-error.js';

target('L2Config', () => {
  describe('生成する', () => {
    context('重複のないvalidatorsを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const validators = ['v1', 'v2'];

        // Act
        const actual = new L2Config({ enabled: true, validators });

        // Assert
        expect(actual.validators).toEqual(['v1', 'v2']);
      });
    });

    context('validatorsに重複がある場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const validators = ['v1', 'v1'];

        // Act
        const actual = () => new L2Config({ enabled: true, validators });

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });

    context('validatorsが空配列の場合', () => {
      it('生成できる', () => {
        // Arrange
        const validators: string[] = [];

        // Act
        const actual = new L2Config({ enabled: false, validators });

        // Assert
        expect(actual.validators).toEqual([]);
      });
    });
  });

  describe('等値性を判定する', () => {
    context('enabledとvalidatorsが同じ場合', () => {
      it('等しい', () => {
        // Arrange
        const left = new L2Config({ enabled: true, validators: ['v1', 'v2'] });
        const right = new L2Config({ enabled: true, validators: ['v1', 'v2'] });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('validatorsの内容が異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new L2Config({ enabled: true, validators: ['v1'] });
        const right = new L2Config({ enabled: true, validators: ['v2'] });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('validatorを参照する', () => {
    context('含まれるvalidatorIdを指定する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const l2Config = new L2Config({ enabled: true, validators: ['v1', 'v2'] });

        // Act
        const actual = l2Config.contains('v1');

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('含まれないvalidatorIdを指定する場合', () => {
      it('falseを返す', () => {
        // Arrange
        const l2Config = new L2Config({ enabled: true, validators: ['v1', 'v2'] });

        // Act
        const actual = l2Config.contains('v3');

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
