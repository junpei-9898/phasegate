/**
 * @layer infrastructure
 * @unit skill-quality
 */
import type { ValidatorIdRegistryPort } from '../../domain/ports/validator-id-registry-port.js';

const FALLBACK_VALIDATOR_IDS = [
  'L1-001', 'L1-002', 'L1-003', 'L1-004', 'L1-005', 'L1-006', 'L1-007', 'L1-008',
  'L2-001', 'L2-002', 'L2-003',
  'L3-001', 'L3-002', 'L3-003', 'L3-004',
  'L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005',
];

export class ValidatorIdRegistryBridgeAdapter implements ValidatorIdRegistryPort {
  async list(): Promise<readonly string[]> {
    // Returns fallback static map until validator-system Registry is integrated
    return FALLBACK_VALIDATOR_IDS;
  }
}
