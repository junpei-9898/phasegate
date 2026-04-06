// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { L4Config } from '../../../../config-foundation/domain/value-objects/l4-config.js';
import { ConfigValidationError } from '../../../../config-foundation/domain/errors/config-validation-error.js';

target('L4Config', () => {
  describe('生成する', () => {
    context('有効なscheduleを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const schedule = '0 0 * * *';

        // Act
        const actual = new L4Config({ enabled: true, validators: [], schedule });

        // Assert
        expect(actual.schedule).toBe(schedule);
      });
    });

    context('scheduleが空文字の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const schedule = '';

        // Act
        const actual = () => new L4Config({ enabled: true, validators: [], schedule });

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });

    context('validatorsに重複がある場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const validators = ['v1', 'v1'];

        // Act
        const actual = () => new L4Config({ enabled: true, validators, schedule: 'daily' });

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });
  });

  describe('等値性を判定する', () => {
    context('同じ属性を比較する場合', () => {
      it('等しい', () => {
        // Arrange
        const left = new L4Config({ enabled: true, validators: ['v1'], schedule: 'daily' });
        const right = new L4Config({ enabled: true, validators: ['v1'], schedule: 'daily' });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('scheduleが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new L4Config({ enabled: true, validators: [], schedule: 'daily' });
        const right = new L4Config({ enabled: true, validators: [], schedule: 'weekly' });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
