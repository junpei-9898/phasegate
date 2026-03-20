import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  CustomRule,
  InvalidCustomRuleError,
} from '../../../phase-dependency-model/domain/values/custom-rule.js';
import { PhaseCustomizationPolicy } from '../../../phase-dependency-model/domain/values/phase-customization-policy.js';

const createCustomRule = (
  overrides: Partial<{
    targetPhase: string;
    condition: string;
    action: readonly string[];
  }> = {},
): CustomRule =>
  CustomRule.create({
    targetPhase: '3:implementation-readiness-checker',
    condition: 'requires-all',
    action: ['2:it-test-logic-designer'],
    ...overrides,
  });

target('CustomRule.create', () => {
  describe('CustomRuleを生成する', () => {
    // UT-PD-075, UT-PD-078, UT-PD-101, UT-PD-102
    it.each([
      {
        title: 'targetPhaseとconditionとactionが有効な場合はCustomRuleが正常に生成される',
        action: ['2:it-test-logic-designer'],
      },
      {
        title: 'actionが複数件の場合は全actionを保持したCustomRuleが生成される',
        action: ['2:it-test-logic-designer', '2:unit-test-logic-designer'],
      },
      {
        title: '1件のactionを指定した場合は正常生成される',
        action: ['2:it-test-logic-designer'],
      },
      {
        title: '複数件のactionを指定した場合は正常生成される',
        action: ['2:it-test-logic-designer', '2:unit-test-logic-designer'],
      },
    ])('$title', ({ action }) => {
      // Arrange
      const input = {
        targetPhase: '3:implementation-readiness-checker',
        condition: 'requires-all',
        action,
      };

      // Act
      const actual = CustomRule.create(input);

      // Assert
      expect(actual.targetPhase).toBe(input.targetPhase);
      expect(actual.condition).toBe(input.condition);
      expect(actual.action).toEqual(action);
    });

    // UT-PD-076, UT-PD-077, UT-PD-100
    it.each([
      {
        title: 'targetPhaseが空文字の場合はInvalidCustomRuleErrorをスローする',
        input: { targetPhase: '', condition: 'requires-all', action: ['2:it-test-logic-designer'] },
      },
      {
        title: 'actionが空配列の場合はInvalidCustomRuleErrorをスローする',
        input: { targetPhase: '3:implementation-readiness-checker', condition: 'requires-all', action: [] },
      },
      {
        title: '空配列はInvalidCustomRuleErrorになる',
        input: { targetPhase: '3:implementation-readiness-checker', condition: 'requires-all', action: [] },
      },
    ])('$title', ({ input }) => {
      // Arrange
      const invalidInput = input;

      // Act
      const actual = () => CustomRule.create(invalidInput);

      // Assert
      expect(actual).toThrowError(InvalidCustomRuleError);
    });
  });
});

target('PhaseCustomizationPolicy.create', () => {
  describe('PhaseCustomizationPolicyを生成する', () => {
    // UT-PD-079, UT-PD-080, UT-PD-081, UT-PD-082
    it.each([
      {
        title: 'rulesとoverrideEnabled=falseの場合はPhaseCustomizationPolicyが正常に生成される',
        rules: [createCustomRule()],
        overrideEnabled: false,
      },
      {
        title: 'overrideEnabled=trueの場合はoverrideEnabled=trueのPhaseCustomizationPolicyが生成される',
        rules: [createCustomRule()],
        overrideEnabled: true,
      },
      {
        title: 'rulesが空配列の場合はルールなしのPhaseCustomizationPolicyが正常に生成される',
        rules: [],
        overrideEnabled: false,
      },
      {
        title: '複数のCustomRuleを持つ場合は全ルールを保持したPhaseCustomizationPolicyが生成される',
        rules: [
          createCustomRule(),
          createCustomRule({
            targetPhase: '3:story-implementor',
            action: ['3:implementation-readiness-checker'],
          }),
        ],
        overrideEnabled: false,
      },
    ])('$title', ({ rules, overrideEnabled }) => {
      // Arrange
      const input = {
        preset: rules.length === 0 ? ('default' as const) : ('custom' as const),
        rules,
        overrideEnabled,
      };

      // Act
      const actual = PhaseCustomizationPolicy.create(input);

      // Assert
      expect(actual.rules).toEqual(rules);
      expect(actual.overrideEnabled).toBe(overrideEnabled);
    });
  });
});

target('PhaseCustomizationPolicy.equals', () => {
  describe('値等価性を判定する', () => {
    // UT-PD-083
    context('同一属性のPhaseCustomizationPolicyを比較する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const props = {
          preset: 'custom' as const,
          rules: [createCustomRule()],
          overrideEnabled: true,
        };
        const left = PhaseCustomizationPolicy.create(props);
        const right = PhaseCustomizationPolicy.create(props);

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
