// @layer test
import { expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { createDocFreshnessRule, createFreshnessThreshold } from '../../../helpers/phase2-extensions-test-factories.js';
import { DocFreshnessRule } from '../../../../phase2-extensions/domain/aggregates/doc-freshness-rule.js';
import { Phase2ExtensionsDomainError } from '../../../../phase2-extensions/domain/errors/phase2-extensions-domain-error.js';

target('UT-P2-006 DocFreshnessRule', () => {
  context('create()', () => {
    it('有効な引数で正常に生成される', () => {
      // Arrange
      const input = {
        ruleId: 'adr-docs',
        documentPattern: 'docs/adr/**/*.md',
        threshold: createFreshnessThreshold(),
        enabled: true,
      };
      // Act
      const actual = DocFreshnessRule.create(input);
      // Assert
      expect(actual.ruleId).toBe('adr-docs');
      expect(actual.isEnabled()).toBe(true);
    });

    it('ruleId が空文字のとき Phase2ExtensionsDomainError をスローする', () => {
      // Arrange / Act / Assert
      expect(() => createDocFreshnessRule({ ruleId: '' })).toThrow(Phase2ExtensionsDomainError);
    });
  });

  context('matchesDocument(documentPath)', () => {
    it('documentPattern に一致するパスに対して true を返す', () => {
      // Arrange
      const rule = createDocFreshnessRule({ documentPattern: 'docs/adr/**/*.md' });
      // Act
      const actual = rule.matchesDocument('docs/adr/0001-test.md');
      // Assert
      expect(actual).toBe(true);
    });

    it('documentPattern に一致しないパスに対して false を返す', () => {
      // Arrange
      const rule = createDocFreshnessRule({ documentPattern: 'docs/adr/**/*.md' });
      // Act
      const actual = rule.matchesDocument('docs/product/design.md');
      // Assert
      expect(actual).toBe(false);
    });
  });
});
