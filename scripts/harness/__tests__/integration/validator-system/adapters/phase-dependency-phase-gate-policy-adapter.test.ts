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
      it('判定結果がbooleanとviolations配列で返る (IT-REPO-PhaseGate-001)', async () => {
        // Arrange
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();
        const input = { unitName: 'validator-system', currentPhase: 'implementation' };

        // Act
        const actual = await adapter.checkPrerequisites(input);

        // Assert
        expect(typeof actual.satisfied).toBe('boolean');
        expect(Array.isArray(actual.violations)).toBe(true);
      });
    });

    context('phase-dependency-modelが応答する場合（graceful skip含む）', () => {
      it('unknown-unitを渡してもエラーなく結果が返る (IT-REPO-PhaseGate-002)', async () => {
        // Arrange
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();
        const input = { unitName: 'unknown-unit', currentPhase: 'implementation' };

        // Act
        const actual = await adapter.checkPrerequisites(input);

        // Assert
        expect(typeof actual.satisfied).toBe('boolean');
      });
    });

    context('複数フェーズを渡した場合', () => {
      it('各フェーズで判定結果が返る (IT-REPO-PhaseGate-003)', async () => {
        // Arrange
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();

        // Act
        const actualImpl = await adapter.checkPrerequisites({ unitName: 'validator-system', currentPhase: 'implementation' });
        const actualPlan = await adapter.checkPrerequisites({ unitName: 'validator-system', currentPhase: 'planning' });

        // Assert
        expect(typeof actualImpl.satisfied).toBe('boolean');
        expect(typeof actualPlan.satisfied).toBe('boolean');
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
