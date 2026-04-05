// @unit agent-integration
// @layer domain

import type { WriteTargetScope } from '../value-objects/write-target-scope.js';
import type { PhaseGateQueryResult } from '../value-objects/phase-gate-query-result.js';

export interface PhaseGateQueryPort {
  checkGate(scope: WriteTargetScope, targetFilePath?: string): Promise<PhaseGateQueryResult>;
}
