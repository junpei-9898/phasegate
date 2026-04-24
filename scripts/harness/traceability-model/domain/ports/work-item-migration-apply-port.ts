// @unit traceability-model
// @layer domain

import type {
  WorkItemMigrationAppliedCandidate,
  WorkItemMigrationCandidate,
} from "../value-objects/work-item-migration-candidate.js";

export interface WorkItemMigrationApplyPort {
  apply(candidate: WorkItemMigrationCandidate): Promise<WorkItemMigrationAppliedCandidate>;
}
