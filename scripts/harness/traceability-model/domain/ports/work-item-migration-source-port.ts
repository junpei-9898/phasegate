// @unit traceability-model
// @layer domain

import type { LegacyIssueDirectory } from "../value-objects/work-item-migration-candidate.js";

export interface WorkItemMigrationSourcePort {
  listLegacyIssueDirectories(): Promise<readonly LegacyIssueDirectory[]>;
}
