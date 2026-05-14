// @unit config-foundation
// @layer test
// @story H04-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { PlanningModeConfig } from '../../../config-foundation/domain/value-objects/planning-mode-config.js';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';

target('PlanningModeConfig', () => {
  describe('生成する', () => {
    // UT-CF-117
    context('defaultがinteractiveの場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = { default: 'interactive', perPhase: {} };

        // Act
        const actual = new PlanningModeConfig(input);

        // Assert
        expect(actual.defaultMode).toBe('interactive');
      });
    });

    // UT-CF-118
    context('defaultがembedded-qaの場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = { default: 'embedded-qa', perPhase: {} };

        // Act
        const actual = new PlanningModeConfig(input);

        // Assert
        expect(actual.defaultMode).toBe('embedded-qa');
      });
    });

    context('defaultがmanualの場合', () => {
      it('生成できる', () => {
        const input = { default: 'manual', perPhase: {} };

        const actual = new PlanningModeConfig(input);

        expect(actual.defaultMode).toBe('manual');
      });
    });

    // UT-CF-119
    context('defaultが未知の値の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = { default: 'unknown', perPhase: {} };

        // Act
        const actual = () => new PlanningModeConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-120
    context('perPhaseに有効な列挙値を渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          default: 'interactive',
          perPhase: { design: 'embedded-qa', retrofit: 'manual' },
        };

        // Act
        const actual = new PlanningModeConfig(input);

        // Assert
        expect(actual.perPhase['design']).toBe('embedded-qa');
        expect(actual.perPhase['retrofit']).toBe('manual');
      });
    });

    // UT-CF-121
    context('perPhaseに無効な列挙値を渡す場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          default: 'interactive',
          perPhase: { design: 'invalid' },
        };

        // Act
        const actual = () => new PlanningModeConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });
  });

  describe('等値性を判定する', () => {
    // UT-CF-122
    context('defaultModeとperPhaseが同じ場合', () => {
      it('等しい', () => {
        // Arrange
        const props = { default: 'interactive', perPhase: { design: 'embedded-qa' } };
        const left = new PlanningModeConfig(props);
        const right = new PlanningModeConfig(props);

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-123
    context('defaultModeが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new PlanningModeConfig({ default: 'interactive', perPhase: {} });
        const right = new PlanningModeConfig({ default: 'embedded-qa', perPhase: {} });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('フェーズごとのモードを解決する', () => {
    // UT-CF-124
    context('perPhaseに定義がある場合', () => {
      it('その値を返す', () => {
        // Arrange
        const planningModeConfig = new PlanningModeConfig({
          default: 'interactive',
          perPhase: { design: 'embedded-qa' },
        });

        // Act
        const actual = planningModeConfig.resolveFor('design');

        // Assert
        expect(actual).toBe('embedded-qa');
      });
    });

    // UT-CF-125
    context('perPhaseに定義がない場合', () => {
      it('defaultModeを返す', () => {
        // Arrange
        const planningModeConfig = new PlanningModeConfig({
          default: 'interactive',
          perPhase: { design: 'embedded-qa' },
        });

        // Act
        const actual = planningModeConfig.resolveFor('review');

        // Assert
        expect(actual).toBe('interactive');
      });
    });
  });
});
