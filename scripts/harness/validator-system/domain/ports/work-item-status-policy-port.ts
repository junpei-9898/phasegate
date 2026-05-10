/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-140
 */

import type { WorkItemStatusReport } from "../../../traceability-model/domain/value-objects/work-item-status-report.js";

export interface WorkItemStatusPolicyPort {
  findStaleReports(targetPaths?: readonly string[]): Promise<readonly WorkItemStatusReport[]>;
}
