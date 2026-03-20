import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { RuleName } from '../../../biome-ast-engine/domain/value-objects/rule-name.js';
import { RuleDefinitionRegistry, InvalidRuleSeverityError, UnknownRuleNameError } from '../../../biome-ast-engine/domain/services/rule-definition-registry.js';

const createRegistry = (): RuleDefinitionRegistry => new RuleDefinitionRegistry();
const createRuleName = (value: string): RuleName => RuleName.fromString(value);

target('RuleDefinitionRegistry.getAll', () => {
  describe('全ルール定義を返す', () => {
    it('8件のRuleDefinitionが返される', () => {
      // Arrange
      const sut = createRegistry();

      // Act
      const actual = sut.getAll();

      // Assert
      expect(actual).toHaveLength(8);
    });

    it('ルール名昇順でソートされている', () => {
      // Arrange
      const sut = createRegistry();

      // Act
      const actual = sut.getAll();

      // Assert
      expect(actual.map((rule) => rule.name.toString())).toEqual(
        [...actual.map((rule) => rule.name.toString())].sort()
      );
    });

    it('全ルールのerrorCodeが一意である', () => {
      // Arrange
      const sut = createRegistry();

      // Act
      const actual = sut.getAll();

      // Assert
      expect(new Set(actual.map((rule) => rule.errorCode)).size).toBe(actual.length);
    });

    it('全ルールのRuleTypeがBiomeNativeまたはExternalAnalyzerである', () => {
      // Arrange
      const sut = createRegistry();

      // Act
      const actual = sut.getAll();

      // Assert
      expect(
        actual.every((rule) => rule.type.isBiomeNative() || rule.type.isExternalAnalyzer())
      ).toBe(true);
    });

    it('errorCodeがL1-001からL1-008の範囲内である', () => {
      // Arrange
      const sut = createRegistry();
      const expectedCodes = new Set([
        'L1-001',
        'L1-002',
        'L1-003',
        'L1-004',
        'L1-005',
        'L1-006',
        'L1-007',
        'L1-008',
      ]);

      // Act
      const actual = sut.getAll();

      // Assert
      expect(actual.every((rule) => expectedCodes.has(rule.errorCode))).toBe(true);
    });

    it('各ルールのrequiredInputsが空でない', () => {
      // Arrange
      const sut = createRegistry();

      // Act
      const actual = sut.getAll();

      // Assert
      expect(actual.every((rule) => rule.requiredInputs.length > 0)).toBe(true);
    });
  });
});

target('RuleDefinitionRegistry.resolveEnabled', () => {
  describe('L1設定に基づき有効ルールを解決する', () => {
    context('l1Enabled=falseの場合', () => {
      it('全ルールがskippedRulesに含まれる', () => {
        // Arrange
        const sut = createRegistry();
        const config = { l1Enabled: false, rules: {} };

        // Act
        const actual = sut.resolveEnabled(config);

        // Assert
        expect(actual.enabledRules).toEqual([]);
        expect(actual.skippedRules).toHaveLength(8);
      });
    });

    context('l1Enabled=trueで設定なしの場合', () => {
      it('8件全てがenabledRulesに含まれる', () => {
        // Arrange
        const sut = createRegistry();
        const config = { l1Enabled: true, rules: {} };

        // Act
        const actual = sut.resolveEnabled(config);

        // Assert
        expect(actual.enabledRules).toHaveLength(8);
      });
    });

    context('特定ルールが"off"の場合', () => {
      it('そのルールがskippedRulesに含まれる', () => {
        // Arrange
        const sut = createRegistry();
        const config = { l1Enabled: true, rules: { 'require-unit-comment': 'off' as const } };

        // Act
        const actual = sut.resolveEnabled(config);

        // Assert
        expect(actual.skippedRules.map((rule) => rule.toString())).toContain('require-unit-comment');
        expect(actual.enabledRules.map((rule) => rule.name.toString())).not.toContain('require-unit-comment');
      });
    });

    context('特定ルールが"warning"の場合', () => {
      it('そのルールのseverityがwarningになる', () => {
        // Arrange
        const sut = createRegistry();
        const config = { l1Enabled: true, rules: { 'no-any-abuse': 'warning' as const } };

        // Act
        const actual = sut.resolveEnabled(config);

        // Assert
        expect(actual.enabledRules.find((rule) => rule.name.toString() === 'no-any-abuse')?.severity).toBe(
          'warning'
        );
      });
    });

    context('特定ルールが"error"の場合', () => {
      it('そのルールのseverityがerrorになる', () => {
        // Arrange
        const sut = createRegistry();
        const config = { l1Enabled: true, rules: { 'no-any-abuse': 'error' as const } };

        // Act
        const actual = sut.resolveEnabled(config);

        // Assert
        expect(actual.enabledRules.find((rule) => rule.name.toString() === 'no-any-abuse')?.severity).toBe(
          'error'
        );
      });
    });

    context('未定義のルール名が設定にある場合', () => {
      it('UnknownRuleNameErrorがスローされる', () => {
        // Arrange
        const sut = createRegistry();
        const config = { l1Enabled: true, rules: { 'unknown-rule': 'error' as const } };

        // Act
        const actual = () => sut.resolveEnabled(config);

        // Assert
        expect(actual).toThrow(UnknownRuleNameError);
      });
    });

    context('不正なseverity値が設定にある場合', () => {
      it('InvalidRuleSeverityErrorがスローされる', () => {
        // Arrange
        const sut = createRegistry();
        const config = { l1Enabled: true, rules: { 'require-unit-comment': 'critical' as never } };

        // Act
        const actual = () => sut.resolveEnabled(config);

        // Assert
        expect(actual).toThrow(InvalidRuleSeverityError);
      });
    });

    context('enabledRulesとskippedRulesが排他的である場合', () => {
      it('両方にルールが重複しない', () => {
        // Arrange
        const sut = createRegistry();
        const config = {
          l1Enabled: true,
          rules: {
            'require-unit-comment': 'off' as const,
            'no-any-abuse': 'warning' as const,
          },
        };

        // Act
        const actual = sut.resolveEnabled(config);

        // Assert
        const enabledRuleNames = new Set(actual.enabledRules.map((rule) => rule.name.toString()));
        const skippedRuleNames = new Set(actual.skippedRules.map((rule) => rule.toString()));
        const duplicates = [...enabledRuleNames].filter((ruleName) => skippedRuleNames.has(ruleName));
        expect(duplicates).toEqual([]);
      });
    });
  });
});

target('RuleDefinitionRegistry.getByName', () => {
  describe('指定ルール名のRuleDefinitionを返す', () => {
    context('存在しないルール名の場合', () => {
      it('UnknownRuleNameErrorがスローされる', () => {
        // Arrange
        const sut = createRegistry();
        const name = { toString: () => 'unknown-rule' } as RuleName;

        // Act
        const actual = () => sut.getByName(name);

        // Assert
        expect(actual).toThrow(UnknownRuleNameError);
      });
    });

    context('8つの正規ルール名それぞれの場合', () => {
      it('対応するRuleDefinitionが返される', () => {
        // Arrange
        const sut = createRegistry();
        const names = [
          createRuleName('require-unit-comment'),
          createRuleName('require-layer-comment'),
          createRuleName('no-layer-violation'),
          createRuleName('enforce-folder-structure'),
          createRuleName('no-any-abuse'),
          createRuleName('no-code-duplication'),
          createRuleName('no-ghost-file'),
          createRuleName('no-comment-flood'),
        ];

        // Act
        const actual = names.map((name) => sut.getByName(name));

        // Assert
        expect(actual).toHaveLength(8);
        expect(actual.every((rule, index) => rule.name.equals(names[index]))).toBe(true);
      });
    });
  });
});
