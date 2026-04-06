// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { L1Config } from '../../../../config-foundation/domain/value-objects/l1-config.js';
import { ConfigValidationError } from '../../../../config-foundation/domain/errors/config-validation-error.js';

target('L1Config', () => {
  describe('生成する', () => {
    context('有効なseverityだけを含む場合', () => {
      it('生成できる', () => {
        // Arrange
        const rules = { 'no-eval': 'error', 'no-var': 'warning' };

        // Act
        const actual = new L1Config({ enabled: true, rules });

        // Assert
        expect(actual.rules['no-eval']).toBe('error');
        expect(actual.rules['no-var']).toBe('warning');
      });
    });

    context('不正なseverityを含む場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const rules = { 'no-eval': 'fatal' };

        // Act
        const actual = () => new L1Config({ enabled: true, rules });

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });

    context('rulesが空オブジェクトの場合', () => {
      it('生成できる', () => {
        // Arrange
        const rules = {};

        // Act
        const actual = new L1Config({ enabled: true, rules });

        // Assert
        expect(Object.keys(actual.rules)).toHaveLength(0);
      });
    });
  });

  describe('等値性を判定する', () => {
    context('enabledとrulesが同じ場合', () => {
      it('等しい', () => {
        // Arrange
        const left = new L1Config({ enabled: true, rules: { 'no-eval': 'error' } });
        const right = new L1Config({ enabled: true, rules: { 'no-eval': 'error' } });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('enabledが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new L1Config({ enabled: true, rules: { 'no-eval': 'error' } });
        const right = new L1Config({ enabled: false, rules: { 'no-eval': 'error' } });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('状態とルールを参照する', () => {
    context('enabled=trueの場合', () => {
      it('isEnabledがtrueを返す', () => {
        // Arrange
        const l1Config = new L1Config({ enabled: true, rules: {} });

        // Act
        const actual = l1Config.isEnabled();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('存在するルール名を指定する場合', () => {
      it('severityを返す', () => {
        // Arrange
        const l1Config = new L1Config({ enabled: true, rules: { 'no-eval': 'error' } });

        // Act
        const actual = l1Config.getRuleSeverity('no-eval');

        // Assert
        expect(actual).toBe('error');
      });
    });

    context('存在しないルール名を指定する場合', () => {
      it('undefinedを返す', () => {
        // Arrange
        const l1Config = new L1Config({ enabled: true, rules: { 'no-eval': 'error' } });

        // Act
        const actual = l1Config.getRuleSeverity('unknown-rule');

        // Assert
        expect(actual).toBeUndefined();
      });
    });
  });
});
