// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CustomPhaseRule } from '../../../config-foundation/domain/value-objects/custom-phase-rule.js';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';

target('CustomPhaseRule', () => {
  describe('生成する', () => {
    // UT-CF-111
    context('有効なphaseとrequiresを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = { phase: 'design', requires: ['review'] };

        // Act
        const actual = new CustomPhaseRule(input);

        // Assert
        expect(actual.phase).toBe('design');
        expect(actual.requires).toEqual(['review']);
      });
    });

    // UT-CF-112
    context('phaseが空文字の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = { phase: '', requires: ['review'] };

        // Act
        const actual = () => new CustomPhaseRule(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-113
    context('requiresに重複がある場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = { phase: 'design', requires: ['review', 'review'] };

        // Act
        const actual = () => new CustomPhaseRule(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-114
    context('requiresが空配列の場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = { phase: 'design', requires: [] };

        // Act
        const actual = new CustomPhaseRule(input);

        // Assert
        expect(actual.phase).toBe('design');
        expect(actual.requires).toEqual([]);
      });
    });
  });

  describe('等値性を判定する', () => {
    // UT-CF-115
    context('同じphaseとrequiresを比較する場合', () => {
      it('等しい', () => {
        // Arrange
        const props = { phase: 'design', requires: ['review'] };
        const left = new CustomPhaseRule(props);
        const right = new CustomPhaseRule(props);

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-116
    context('phaseが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new CustomPhaseRule({ phase: 'design', requires: ['review'] });
        const right = new CustomPhaseRule({ phase: 'implement', requires: ['review'] });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
