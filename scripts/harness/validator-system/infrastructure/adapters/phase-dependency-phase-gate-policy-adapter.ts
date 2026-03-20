/**
 * @layer infrastructure
 * @unit validator-system
 *
 * PhaseDependencyPhaseGatePolicyAdapter — PhaseGatePolicyPort実装
 */
import type { PhaseGatePolicyPort } from '../../domain/ports/phase-gate-policy-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';

export class PhaseDependencyPhaseGatePolicyAdapter implements PhaseGatePolicyPort {
  async checkPrerequisites(context: { unitName: string; currentPhase: string }): Promise<{
    satisfied: boolean;
    violations: readonly HarnessErrorLike[];
  }> {
    // phase-dependency-model の PhaseGate 前提条件確認の stub 実装
    // 実際の実装では phase-dependency-model の公開インターフェースを使用する
    return { satisfied: true, violations: [] };
  }
}
