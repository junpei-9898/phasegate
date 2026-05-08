// @layer test
// @unit config-foundation
// @story H04-01
// @work-item-id WI-094
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ValidateConfig } from '../../../config-foundation/domain/value-objects/validate-config.js';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';

target('ValidateConfig', () => {
  describe('生成する', () => {
    context('failOnWarning が boolean の場合', () => {
      it('生成できる (false)', () => {
        // Arrange
        const input = { failOnWarning: false };
        // Act
        const actual = new ValidateConfig(input);
        // Assert
        expect(actual.failOnWarning).toBe(false);
      });

      it('生成できる (true)', () => {
        // Arrange
        const input = { failOnWarning: true };
        // Act
        const actual = new ValidateConfig(input);
        // Assert
        expect(actual.failOnWarning).toBe(true);
      });
    });

    context('failOnWarning が boolean でない場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = { failOnWarning: 'true' as unknown as boolean };
        // Act
        const actual = () => new ValidateConfig(input);
        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });
  });

  describe('等値性を判定する', () => {
    context('failOnWarning が同じ場合', () => {
      it('等しい', () => {
        // Arrange
        const left = new ValidateConfig({ failOnWarning: false });
        const right = new ValidateConfig({ failOnWarning: false });
        // Act
        const actual = left.equals(right);
        // Assert
        expect(actual).toBe(true);
      });
    });

    context('failOnWarning が異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new ValidateConfig({ failOnWarning: false });
        const right = new ValidateConfig({ failOnWarning: true });
        // Act
        const actual = left.equals(right);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
