// @layer test
// @unit validator-system

import { afterEach, describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { PhaseDependencyPhaseGatePolicyAdapter } from '../../../../validator-system/infrastructure/adapters/phase-dependency-phase-gate-policy-adapter.js';

const createConfigFoundationModuleMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../config-foundation/composition-root.js', () => ({
  createConfigFoundationModule: createConfigFoundationModuleMock,
}));

target('PhaseDependencyPhaseGatePolicyAdapter (fail-closed)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createConfigFoundationModuleMock.mockReset();
  });

  describe('checkPrerequisites', () => {
    context('依存する phase-dependency-model 経路が例外を投げる場合', () => {
      it('前提充足扱い(satisfied=true)にせず、violationを伴う不充足を返すこと', async () => {
        // Arrange
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        createConfigFoundationModuleMock.mockReturnValue({
          usecases: {
            loadResolvedConfigUseCase: {
              execute: vi.fn().mockRejectedValue(new Error('phase model unavailable')),
            },
          },
        });
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();
        const input = { unitName: 'validator-system', currentPhase: 'implementation' };

        // Act
        const actual = await adapter.checkPrerequisites(input);

        // Assert
        expect(actual.satisfied).toBe(false);
        expect(actual.violations.length).toBeGreaterThan(0);
        expect(actual.violations[0].message).toContain('phase model unavailable');
      });
    });
  });
});
