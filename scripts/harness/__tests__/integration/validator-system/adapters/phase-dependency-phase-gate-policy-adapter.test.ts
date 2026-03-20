/**
 * @layer test
 * @unit validator-system
 * @story H08-01
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { PhaseDependencyPhaseGatePolicyAdapter } from '../../../../validator-system/infrastructure/adapters/phase-dependency-phase-gate-policy-adapter.js';

target('PhaseDependencyPhaseGatePolicyAdapter', () => {
  describe('checkPrerequisites', () => {
    context('前提条件を満たす場合', () => {
      it('satisfied=trueかつviolations=[]が返る (IT-REPO-PhaseGate-001)', async () => {
        // Arrange
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();
        const input = { unitName: 'validator-system', currentPhase: 'implementation' };

        // Act
        const actual = await adapter.checkPrerequisites(input);

        // Assert
        expect(actual.satisfied).toBe(true);
        expect(actual.violations).toHaveLength(0);
      });
    });

    context('stubアダプタが常にsatisfied=trueを返す場合', () => {
      it('violated=falseのunitNameを渡してもsatisfied=trueが返る (IT-REPO-PhaseGate-002)', async () => {
        // Arrange
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();
        const input = { unitName: 'unknown-unit', currentPhase: 'implementation' };

        // Act
        const actual = await adapter.checkPrerequisites(input);

        // Assert
        expect(actual.satisfied).toBe(true);
        expect(typeof actual.satisfied).toBe('boolean');
      });
    });

    context('複数フェーズを渡した場合', () => {
      it('各フェーズでsatisfied=trueが返る (IT-REPO-PhaseGate-003)', async () => {
        // Arrange
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();

        // Act
        const actualImpl = await adapter.checkPrerequisites({ unitName: 'validator-system', currentPhase: 'implementation' });
        const actualPlan = await adapter.checkPrerequisites({ unitName: 'validator-system', currentPhase: 'planning' });

        // Assert
        expect(actualImpl.satisfied).toBe(true);
        expect(actualPlan.satisfied).toBe(true);
      });
    });

    context('violations配列の型チェック', () => {
      it('violationsは配列として返される (IT-REPO-PhaseGate-004)', async () => {
        // Arrange
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();
        const input = { unitName: 'validator-system', currentPhase: 'implementation' };

        // Act
        const actual = await adapter.checkPrerequisites(input);

        // Assert
        expect(Array.isArray(actual.violations)).toBe(true);
      });
    });
  });
});
