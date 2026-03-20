/**
 * @layer domain
 * @unit phase-dependency-model
 */

import type { PhaseNode } from '../values/phase-node.js';
import type { PlanEvidence } from '../values/plan-evidence.js';
import type { PlanningMode } from '../values/planning-mode.js';

export interface PlanDocumentReaderPort {
  readEvidence(
    node: PhaseNode,
    scope: { unitId?: string; storyId?: string },
    expectedMode: PlanningMode,
  ): Promise<PlanEvidence>;
}
