// @unit ci-governance
// @layer infrastructure

import type { ValidatorIdRegistryPort } from '../../domain/ports/validator-id-registry-port.js';

export class ValidatorIdRegistryAdapter implements ValidatorIdRegistryPort {
  constructor(private readonly registryUrl?: string) {}

  async listAll(): Promise<string[]> {
    // In a real implementation, would fetch from validator-system
    // For now, returns a stub list
    return ['L1-001', 'L2-001', 'L2-002', 'L3-001', 'L4-001'];
  }
}
