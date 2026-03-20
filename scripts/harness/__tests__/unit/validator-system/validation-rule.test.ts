/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it } from 'vitest';
import { target, createValidationRule } from '../../helpers/test-helpers.js';
import { ValidationRule } from '../../../validator-system/domain/value-objects/validation-rule.js';

target('ValidationRule', () => {

  describe('有効なフィールドからValidationRuleを生成する', () => {

    it('全フィールド有効でValidationRuleが生成されること (UT-VRL-001)', () => {
      // Arrange
      const props = {
        ruleName: 'aaa-pattern',
        errorTemplate: { code: 'L2-001', severity: 'error' as const, messageTemplate: 'AAAパターン違反' },
        fixExample: 'const fixed = true;',
      };
      // Act
      const actual = ValidationRule.create(props);
      // Assert
      expect(actual).toBeDefined();
      expect(actual.ruleName).toBe('aaa-pattern');
    });

    it('fixExample: nullでValidationRuleが生成されること（fixExampleはオプション） (UT-VRL-002)', () => {
      // Arrange
      const props = {
        ruleName: 'aaa-pattern',
        errorTemplate: { code: 'L2-001', severity: 'error' as const, messageTemplate: 'AAAパターン違反' },
        fixExample: null,
      };
      // Act
      const actual = ValidationRule.create(props);
      // Assert
      expect(actual.fixExample).toBeNull();
    });

    it('errorTemplate.severity: errorでValidationRuleが生成されること (UT-VRL-003)', () => {
      // Arrange
      const sut = createValidationRule({ errorTemplate: { code: 'L2-001', severity: 'error', messageTemplate: 'msg' } });
      // Act
      const actual = sut.errorTemplate.severity;
      // Assert
      expect(actual).toBe('error');
    });

    it('errorTemplate.severity: warningでValidationRuleが生成されること (UT-VRL-004)', () => {
      // Arrange
      const sut = createValidationRule({ errorTemplate: { code: 'L2-001', severity: 'warning', messageTemplate: 'msg' } });
      // Act
      const actual = sut.errorTemplate.severity;
      // Assert
      expect(actual).toBe('warning');
    });
  });

  describe('buildErrorCode()でエラーコードを返す', () => {

    it('errorTemplate.code: L2-003のときL2-003を返すこと (UT-VRL-005)', () => {
      // Arrange
      const sut = createValidationRule({ errorTemplate: { code: 'L2-003', severity: 'error', messageTemplate: 'msg' } });
      // Act
      const actual = sut.buildErrorCode();
      // Assert
      expect(actual).toBe('L2-003');
    });
  });

  describe('equals()で同値比較を行う', () => {

    it('同一ruleNameの2つのValidationRuleのequals()がtrueを返すこと (UT-VRL-006)', () => {
      // Arrange
      const a = createValidationRule({ ruleName: 'aaa-pattern' });
      const b = createValidationRule({ ruleName: 'aaa-pattern' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    it('異なるruleNameの2つのValidationRuleのequals()がfalseを返すこと (UT-VRL-007)', () => {
      // Arrange
      const a = createValidationRule({ ruleName: 'aaa-pattern' });
      const b = createValidationRule({ ruleName: 'hardcoded-secret' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
