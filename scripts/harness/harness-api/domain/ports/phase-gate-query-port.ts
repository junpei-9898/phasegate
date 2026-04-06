// @layer domain
// phase-gate-query-port.ts

import type { PhaseGateStoryResult } from '../value-objects/check-ready-result.js';
import type { PhaseInfo } from '../value-objects/phase-info.js';

export interface PhaseGateQueryPort {
  queryAllStories(): Promise<PhaseGateStoryResult[]>;
  queryUnit(unitId: string): Promise<PhaseInfo | null>;
}
