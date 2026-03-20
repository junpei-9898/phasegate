import { expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { createFreshnessThreshold } from '../../../helpers/phase2-extensions-test-factories.js';
import { Phase2ExtensionsDomainError } from '../../../../phase2-extensions/domain/errors/phase2-extensions-domain-error.js';
import { FreshnessThreshold } from '../../../../phase2-extensions/domain/value-objects/freshness-threshold.js';

target('UT-P2-001 FreshnessThreshold', () => {
  context('create()', () => {
    it('warnThresholdDays=14, errorThresholdDays=30 で正常に生成される', () => {
      // Arrange
      const input = { warnThresholdDays: 14, errorThresholdDays: 30 };
      // Act
      const actual = FreshnessThreshold.create(input);
      // Assert
      expect(actual.warnThresholdDays).toBe(14);
      expect(actual.errorThresholdDays).toBe(30);
    });

    it('warnThresholdDays=0 のとき Phase2ExtensionsDomainError をスローする', () => {
      // Arrange / Act / Assert
      expect(() => FreshnessThreshold.create({ warnThresholdDays: 0, errorThresholdDays: 30 })).toThrow(
        Phase2ExtensionsDomainError,
      );
    });

    it('errorThresholdDays が warnThresholdDays 以下のとき Phase2ExtensionsDomainError をスローする', () => {
      // Arrange / Act / Assert
      expect(() => FreshnessThreshold.create({ warnThresholdDays: 30, errorThresholdDays: 30 })).toThrow(
        Phase2ExtensionsDomainError,
      );
    });
  });

  context('equals()', () => {
    it('同一フィールドを持つ2つのインスタンスは等値である', () => {
      // Arrange
      const lhs = createFreshnessThreshold();
      const rhs = createFreshnessThreshold();
      // Act
      const actual = lhs.equals(rhs);
      // Assert
      expect(actual).toBe(true);
    });

    it('errorThresholdDays が異なる場合は非等値である', () => {
      // Arrange
      const lhs = createFreshnessThreshold({ errorThresholdDays: 30 });
      const rhs = createFreshnessThreshold({ errorThresholdDays: 60 });
      // Act
      const actual = lhs.equals(rhs);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
