// @unit validator-system
// @layer domain
// @work-item-id WI-132 / WI-133 / WI-136 / WI-137 / WI-138

import type { ContractTraceabilityInput } from '../value-objects/contract-traceability-model.js';

export interface ContractTraceabilityPolicyPort {
  collect(targetPaths: readonly string[]): Promise<ContractTraceabilityInput>;
}
