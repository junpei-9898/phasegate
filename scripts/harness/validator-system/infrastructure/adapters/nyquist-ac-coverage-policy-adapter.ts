/**
 * @layer infrastructure
 * @unit validator-system
 *
 * NyquistAcCoveragePolicyAdapter — AcCoveragePolicyPort実装
 */
import type { AcCoveragePolicyPort, AcCoverageGatePolicy } from '../../domain/ports/ac-coverage-policy-port.js';

export class NyquistAcCoveragePolicyAdapter implements AcCoveragePolicyPort {
  async getPolicy(): Promise<AcCoverageGatePolicy> {
    // stub実装: 実際の実装ではnyquist-validationの公開インターフェースを使用する
    return {
      check: (_matrix) => ({ passed: true, errors: [] }),
    };
  }
}
