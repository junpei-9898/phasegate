import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { PhaseDependenciesConfig } from '../../../config-foundation/domain/value-objects/phase-dependencies-config.js';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';

target('PhaseDependenciesConfig', () => {
  describe('生成する', () => {
    // UT-CF-104
    context('default presetと空customRulesを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          preset: 'default' as const,
          override: false,
          customRules: [],
        };

        // Act
        const actual = new PhaseDependenciesConfig(input);

        // Assert
        expect(actual.preset).toBe('default');
        expect(actual.override).toBe(false);
        expect(actual.customRules).toEqual([]);
        expect(actual.gates).toEqual([]);
      });
    });

    // UT-CF-105
    context('customRules.phaseが空文字の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          preset: 'custom' as const,
          override: true,
          customRules: [{ phase: '', requires: ['review'] }],
        };

        // Act
        const actual = () => new PhaseDependenciesConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-106
    context('custom presetでcustomRulesを持つ場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          preset: 'custom' as const,
          override: true,
          customRules: [{ phase: 'design', requires: ['review'] }],
          gates: [{ name: 'story-implementor', level: 3 }],
        };

        // Act
        const actual = new PhaseDependenciesConfig(input);

        // Assert
        expect(actual.hasCustomRules()).toBe(true);
        expect(actual.customRules[0].phase).toBe('design');
        expect(actual.customRules[0].requires).toEqual(['review']);
        expect(actual.gates).toEqual([{ name: 'story-implementor', level: 3 }]);
      });
    });

    context('standard presetと空customRulesを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          preset: 'standard' as const,
          override: false,
          customRules: [],
        };

        // Act
        const actual = new PhaseDependenciesConfig(input);

        // Assert
        expect(actual.preset).toBe('standard');
        expect(actual.override).toBe(false);
        expect(actual.customRules).toEqual([]);
      });
    });

    context('gatesを省略する場合', () => {
      it('空配列として保持する', () => {
        // Arrange
        const input = {
          preset: 'custom' as const,
          override: false,
          customRules: [],
        };

        // Act
        const actual = new PhaseDependenciesConfig(input);

        // Assert
        expect(actual.gates).toEqual([]);
      });
    });
  });

  describe('等値性を判定する', () => {
    // UT-CF-107
    context('同じ属性を比較する場合', () => {
      it('等しい', () => {
        // Arrange
        const props = {
          preset: 'default' as const,
          override: false,
          customRules: [],
        };
        const left = new PhaseDependenciesConfig(props);
        const right = new PhaseDependenciesConfig(props);

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-108
    context('presetが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new PhaseDependenciesConfig({
          preset: 'default',
          override: false,
          customRules: [],
        });
        const right = new PhaseDependenciesConfig({
          preset: 'custom',
          override: false,
          customRules: [],
        });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('gatesが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new PhaseDependenciesConfig({
          preset: 'custom',
          override: false,
          customRules: [],
          gates: [{ name: 'story-implementor', level: 3 }],
        });
        const right = new PhaseDependenciesConfig({
          preset: 'custom',
          override: false,
          customRules: [],
          gates: [{ name: 'story-implementor', level: 2 }],
        });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('customRulesの有無を判定する', () => {
    // UT-CF-109
    context('customRulesが1件以上ある場合', () => {
      it('trueを返す', () => {
        // Arrange
        const phaseDependenciesConfig = new PhaseDependenciesConfig({
          preset: 'custom',
          override: true,
          customRules: [{ phase: 'design', requires: ['review'] }],
        });

        // Act
        const actual = phaseDependenciesConfig.hasCustomRules();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-110
    context('customRulesが空の場合', () => {
      it('falseを返す', () => {
        // Arrange
        const phaseDependenciesConfig = new PhaseDependenciesConfig({
          preset: 'default',
          override: false,
          customRules: [],
        });

        // Act
        const actual = phaseDependenciesConfig.hasCustomRules();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('gatesの有無を判定する', () => {
    context('gatesが1件以上ある場合', () => {
      it('trueを返す', () => {
        // Arrange
        const phaseDependenciesConfig = new PhaseDependenciesConfig({
          preset: 'custom',
          override: false,
          customRules: [],
          gates: [{ name: 'story-implementor', level: 3 }],
        });

        // Act
        const actual = phaseDependenciesConfig.hasCustomGates();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('gatesが空の場合', () => {
      it('falseを返す', () => {
        // Arrange
        const phaseDependenciesConfig = new PhaseDependenciesConfig({
          preset: 'custom',
          override: false,
          customRules: [],
          gates: [],
        });

        // Act
        const actual = phaseDependenciesConfig.hasCustomGates();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
