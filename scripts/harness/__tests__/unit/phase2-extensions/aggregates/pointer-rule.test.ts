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
      // Arrange / Act / Assert
      expect(() => PointerRule.create({ ruleId: '', documentPattern: 'docs/**/*.md', failOnBroken: true })).toThrow(
        Phase2ExtensionsDomainError,
      );
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
});
