// @layer test
// @unit phase2-extensions
// @story HF2-04
import { beforeEach, expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { InitialCreationExpirationCheckService } from '../../../../phase2-extensions/domain/services/initial-creation-expiration-check-service.js';
import { InitialCreationExpirationRule } from '../../../../phase2-extensions/domain/aggregates/initial-creation-expiration-rule.js';
import { InitialCreationAge } from '../../../../phase2-extensions/domain/value-objects/initial-creation-age.js';

const makeRule = (overrides: Partial<Parameters<typeof InitialCreationExpirationRule.create>[0]> = {}) =>
  InitialCreationExpirationRule.create({
    ruleId: 'r1',
    documentPattern: 'docs/**/*.md',
    daysThreshold: 90,
    commitCountThreshold: 5,
    evaluationMode: 'or',
    enabled: true,
    ...overrides,
  });

const makeAge = (overrides: Partial<Parameters<typeof InitialCreationAge.create>[0]> = {}) =>
  InitialCreationAge.create({
    ageInDays: 30,
    commitCount: 2,
    source: 'git-log',
    ...overrides,
  });

target('UT-P2-066〜073 InitialCreationExpirationCheckService', () => {
  let service: InitialCreationExpirationCheckService;

  beforeEach(() => {
    service = new InitialCreationExpirationCheckService();
  });

  context('check()', () => {
    it('mode=or, 両閾値未満のとき level=\'ok\' を返す', () => {
      // Arrange
      const rule = makeRule();
      const age = makeAge({ ageInDays: 30, commitCount: 2 });
      // Act
      const actual = service.check(rule, age, 'docs/foo.md');
      // Assert
      expect(actual.level).toBe('ok');
    });

    it('mode=or, 日数閾値到達のとき level=\'warn\' を返す', () => {
      // Arrange
      const rule = makeRule();
      const age = makeAge({ ageInDays: 90, commitCount: 2 });
      // Act
      const actual = service.check(rule, age, 'docs/foo.md');
      // Assert
      expect(actual.level).toBe('warn');
    });

    it('mode=or, コミット閾値到達のとき level=\'warn\' を返す', () => {
      // Arrange
      const rule = makeRule();
      const age = makeAge({ ageInDays: 30, commitCount: 5 });
      // Act
      const actual = service.check(rule, age, 'docs/foo.md');
      // Assert
      expect(actual.level).toBe('warn');
    });

    it('mode=or, 両方超過のとき level=\'warn\' を返す', () => {
      // Arrange
      const rule = makeRule();
      const age = makeAge({ ageInDays: 100, commitCount: 10 });
      // Act
      const actual = service.check(rule, age, 'docs/foo.md');
      // Assert
      expect(actual.level).toBe('warn');
    });

    it('mode=and, 片方のみ超過のとき level=\'ok\' を返す', () => {
      // Arrange
      const rule = makeRule({ evaluationMode: 'and' });
      const age = makeAge({ ageInDays: 100, commitCount: 2 });
      // Act
      const actual = service.check(rule, age, 'docs/foo.md');
      // Assert
      expect(actual.level).toBe('ok');
    });

    it('mode=and, 両方超過のとき level=\'warn\' を返す', () => {
      // Arrange
      const rule = makeRule({ evaluationMode: 'and' });
      const age = makeAge({ ageInDays: 100, commitCount: 10 });
      // Act
      const actual = service.check(rule, age, 'docs/foo.md');
      // Assert
      expect(actual.level).toBe('warn');
    });

    it('enabled=false のルールに対して level=\'ok\' を返す', () => {
      // Arrange
      const rule = makeRule({ enabled: false });
      const age = makeAge({ ageInDays: 365, commitCount: 100 });
      // Act
      const actual = service.check(rule, age, 'docs/foo.md');
      // Assert
      expect(actual.level).toBe('ok');
    });

    it('境界値 ageInDays===daysThreshold のとき level=\'warn\' を返す', () => {
      // Arrange
      const rule = makeRule();
      const age = makeAge({ ageInDays: 90, commitCount: 2 });
      // Act
      const actual = service.check(rule, age, 'docs/foo.md');
      // Assert
      expect(actual.level).toBe('warn');
    });
  });
});
