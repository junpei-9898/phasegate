// @layer test
// @unit phase2-extensions
// @story HF2-02
// @work-item-id WI-122
import { expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { PointerRule } from '../../../../phase2-extensions/domain/aggregates/pointer-rule.js';
import { Phase2ExtensionsDomainError } from '../../../../phase2-extensions/domain/errors/phase2-extensions-domain-error.js';

target('UT-P2-007 PointerRule', () => {
  context('create()', () => {
    it('有効な引数で正常に生成される', () => {
      // Arrange / Act
      const actual = PointerRule.create({
        ruleId: 'docs-pointers',
        documentPattern: 'docs/**/*.md',
        failOnBroken: true,
      });
      // Assert
      expect(actual.ruleId).toBe('docs-pointers');
    });

    it('ruleId が空文字のとき Phase2ExtensionsDomainError をスローする', () => {
      // Arrange
      const actual = () => PointerRule.create({ ruleId: '', documentPattern: 'docs/**/*.md', failOnBroken: true });
      // Act / Assert
      expect(actual).toThrow(Phase2ExtensionsDomainError);
    });
  });

  context('shouldFailOnBroken()', () => {
    it('failOnBroken=true のとき true を返す', () => {
      // Arrange
      const rule = PointerRule.create({ ruleId: 'r', documentPattern: 'docs/**/*.md', failOnBroken: true });
      // Act
      const actual = rule.shouldFailOnBroken();
      // Assert
      expect(actual).toBe(true);
    });
  });

  context('policyFor(pointerType)', () => {
    it('pointerPolicies で pointer type ごとの fail/warn/skip を返す', () => {
      // Arrange
      const rule = PointerRule.create({
        ruleId: 'r',
        documentPattern: 'docs/**/*.md',
        failOnBroken: true,
        pointerPolicies: { 'product-doc': 'fail', implementation: 'warn', 'external-url': 'skip' },
      });
      // Act
      const actual = {
        productDoc: rule.policyFor('product-doc'),
        implementation: rule.policyFor('implementation'),
        externalUrl: rule.policyFor('external-url'),
      };
      // Assert
      expect(actual).toEqual({
        productDoc: 'fail',
        implementation: 'warn',
        externalUrl: 'skip',
      });
    });
  });
});
