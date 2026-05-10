// @unit traceability-model
// @layer domain
// @work-item-id WI-126

import type {
  WorkItemStatusApplyResult,
  WorkItemStatusInput,
  WorkItemStatusReport,
} from "../value-objects/work-item-status-report.js";

export interface WorkItemStatusPort {
  listWorkItemStatusInputs(): Promise<readonly WorkItemStatusInput[]>;
  applyDerivedStatuses(
    reports: readonly WorkItemStatusReport[],
  ): Promise<WorkItemStatusApplyResult>;
}
