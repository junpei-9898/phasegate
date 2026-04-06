// @layer test
import { expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { Phase2ExtensionsDomainError } from '../../../../phase2-extensions/domain/errors/phase2-extensions-domain-error.js';
import { E2EStrategyTemplate } from '../../../../phase2-extensions/domain/value-objects/e2e-strategy-template.js';

target('UT-P2-005 E2EStrategyTemplate', () => {
  context('create(targetPhase)', () => {
    it('targetPhase="wave1" で正常に生成される', () => {
      // Arrange / Act
      const actual = E2EStrategyTemplate.create('wave1');
      // Assert
      expect(actual.targetPhase).toBe('wave1');
      expect(actual.templateContent).toContain('wave1');
    });

    it('targetPhase が空文字のとき Phase2ExtensionsDomainError をスローする', () => {
      // Arrange / Act / Assert
      expect(() => E2EStrategyTemplate.create('')).toThrow(Phase2ExtensionsDomainError);
    });
  });
});
