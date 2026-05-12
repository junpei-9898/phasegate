// @unit traceability-model
// @layer domain
// @work-item-id WI-027

import type { LegacyIssueDirectory } from "../value-objects/work-item-migration-candidate.js";

export interface WorkItemMigrationSourcePort {
  listLegacyIssueDirectories(): Promise<readonly LegacyIssueDirectory[]>;
  listExistingWorkItemIds(): Promise<readonly string[]>;
}
