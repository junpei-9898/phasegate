// @layer test
// @unit phase2-extensions
// @story HF2-01
// @work-item-id WI-122
import { beforeEach, expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { createDocFreshnessRule, createDocumentAge } from '../../../helpers/phase2-extensions-test-factories.js';
import { FreshnessCheckService } from '../../../../phase2-extensions/domain/services/freshness-check-service.js';

target('UT-P2-008 FreshnessCheckService', () => {
  let service: FreshnessCheckService;

  beforeEach(() => {
    service = new FreshnessCheckService();
  });

  context('check()', () => {
    it('ageInDays=5 のとき level="ok" を返す', () => {
      // Arrange
      const rule = createDocFreshnessRule({ warnThresholdDays: 14, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 5 });
      // Act
      const actual = service.check(rule, documentAge, 'docs/design.md');
      // Assert
      expect(actual.level).toBe('ok');
    });

    it('ageInDays=20 のとき level="warn" を返す', () => {
      // Arrange
      const rule = createDocFreshnessRule({ warnThresholdDays: 14, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 20 });
      // Act
      const actual = service.check(rule, documentAge, 'docs/design.md');
      // Assert
      expect(actual.level).toBe('warn');
    });

    it('ageInDays=30 のとき level="error" を返す', () => {
      // Arrange
      const rule = createDocFreshnessRule({ warnThresholdDays: 14, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 30 });
      // Act
      const actual = service.check(rule, documentAge, 'docs/design.md');
      // Assert
      expect(actual.level).toBe('error');
    });

    it('enabled=false のルールに対して level="ok" を返す', () => {
      // Arrange
      const rule = createDocFreshnessRule({ enabled: false });
      const documentAge = createDocumentAge({ ageInDays: 365 });
      // Act
      const actual = service.check(rule, documentAge, 'docs/design.md');
      // Assert
      expect(actual.level).toBe('ok');
    });

    it('related-source-change source の古い文書を stale-after-source-change と分類する', () => {
      // Arrange
      const rule = createDocFreshnessRule({ warnThresholdDays: 14, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 20, source: 'related-source-change' });
      // Act
      const actual = service.check(rule, documentAge, 'docs/design.md');
      // Assert
      expect(actual.category).toBe('stale-after-source-change');
      expect(actual.nextAction).toBe('Refresh the document against the related WI/product/source change');
    });
  });
});
