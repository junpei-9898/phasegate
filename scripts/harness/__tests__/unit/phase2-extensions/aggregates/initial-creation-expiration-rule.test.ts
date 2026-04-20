// @layer test
// @unit phase2-extensions
// @story HF2-04
import { expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { Phase2ExtensionsDomainError } from '../../../../phase2-extensions/domain/errors/phase2-extensions-domain-error.js';
import {
  InitialCreationExpirationRule,
  type InitialCreationEvaluationMode,
} from '../../../../phase2-extensions/domain/aggregates/initial-creation-expiration-rule.js';

target('UT-P2-074〜078 InitialCreationExpirationRule', () => {
  context('create()', () => {
    it('正常値でインスタンス生成に成功する', () => {
      // Arrange
      const input = {
        ruleId: 'default',
        documentPattern: 'docs/**/*.md',
        daysThreshold: 90,
        commitCountThreshold: 5,
        evaluationMode: 'or' as const,
        enabled: true,
      };

      // Act
      const actual = InitialCreationExpirationRule.create(input);

      // Assert
      expect(actual.ruleId).toBe('default');
      expect(actual.documentPattern).toBe('docs/**/*.md');
      expect(actual.daysThreshold).toBe(90);
      expect(actual.commitCountThreshold).toBe(5);
      expect(actual.evaluationMode).toBe('or');
      expect(actual.enabled).toBe(true);
      expect(actual.isEnabled()).toBe(true);
      expect(actual.matchesDocument('docs/foo.md')).toBe(true);
      expect(actual.matchesDocument('docs/subdir/foo.md')).toBe(true);
    });

    it('daysThreshold=0 は例外をスローする', () => {
      // Arrange
      const invalidInput = {
        ruleId: 'r1',
        documentPattern: 'docs/**/*.md',
        daysThreshold: 0,
        commitCountThreshold: 5,
        evaluationMode: 'or' as const,
        enabled: true,
      };

      // Act & Assert
      expect(() => InitialCreationExpirationRule.create(invalidInput)).toThrow(Phase2ExtensionsDomainError);
    });

    it('commitCountThreshold=-1 は例外をスローする', () => {
      // Arrange
      const invalidInput = {
        ruleId: 'r1',
        documentPattern: 'docs/**/*.md',
        daysThreshold: 90,
        commitCountThreshold: -1,
        evaluationMode: 'or' as const,
        enabled: true,
      };

      // Act & Assert
      expect(() => InitialCreationExpirationRule.create(invalidInput)).toThrow(Phase2ExtensionsDomainError);
    });

    it('evaluationMode が不正な値のとき例外をスローする', () => {
      // Arrange
      const invalidInput = {
        ruleId: 'r1',
        documentPattern: 'docs/**/*.md',
        daysThreshold: 90,
        commitCountThreshold: 5,
        evaluationMode: 'invalid' as unknown as InitialCreationEvaluationMode,
        enabled: true,
      };

      // Act & Assert
      expect(() => InitialCreationExpirationRule.create(invalidInput)).toThrow(Phase2ExtensionsDomainError);
    });

    it('ruleId が空文字のとき例外をスローする', () => {
      // Arrange
      const invalidInput = {
        ruleId: '',
        documentPattern: 'docs/**/*.md',
        daysThreshold: 90,
        commitCountThreshold: 5,
        evaluationMode: 'or' as const,
        enabled: true,
      };

      // Act & Assert
      expect(() => InitialCreationExpirationRule.create(invalidInput)).toThrow(Phase2ExtensionsDomainError);
    });
  });
});
