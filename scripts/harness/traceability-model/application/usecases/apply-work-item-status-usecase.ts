// @unit traceability-model
// @layer application
// @work-item-id WI-126 / WI-140

import type { WorkItemStatusPort } from "../../domain/ports/work-item-status-port.js";
import type { WorkItemStatusApplyResult, WorkItemStatusReport } from "../../domain/value-objects/work-item-status-report.js";
import type { DeriveWorkItemStatusUseCase } from "./derive-work-item-status-usecase.js";
import type { WorkItemStatus } from "../../domain/value-objects/work-item-frontmatter.js";

export interface ApplyWorkItemStatusUseCaseDeps {
  readonly deriveWorkItemStatusUseCase: Pick<DeriveWorkItemStatusUseCase, "execute">;
  readonly workItemStatusPort: WorkItemStatusPort;
}

export class ApplyWorkItemStatusUseCase {
  private readonly deriveWorkItemStatusUseCase: Pick<DeriveWorkItemStatusUseCase, "execute">;
  private readonly workItemStatusPort: WorkItemStatusPort;

  constructor(deps: ApplyWorkItemStatusUseCaseDeps) {
    this.deriveWorkItemStatusUseCase = deps.deriveWorkItemStatusUseCase;
    this.workItemStatusPort = deps.workItemStatusPort;
  }

  async execute(input: { readonly id?: string; readonly allowDowngrade?: boolean; readonly changedOnly?: boolean } = {}): Promise<WorkItemStatusApplyResult> {
    const reports = await this.deriveWorkItemStatusUseCase.execute();
    const targetReports = input.id
      ? reports.filter((report) => report.id === input.id)
      : reports;
    const blocked = input.allowDowngrade ? [] : targetReports.filter((report) => this.isDowngrade(report));
    const allowed = input.allowDowngrade ? targetReports : targetReports.filter((report) => !this.isDowngrade(report));
    const result = await this.workItemStatusPort.applyDerivedStatuses(allowed);
    return Object.freeze({
      updated: result.updated,
      unchanged: result.unchanged,
      blocked: Object.freeze([...result.blocked, ...blocked]),
    });
  }

  private isDowngrade(report: WorkItemStatusReport): boolean {
    if (!report.stale) return false;
    return statusOrder(report.derivedStatus) < statusOrder(report.currentStatus);
  }
}

// `completed` is a manually promoted terminal state that the automatic
// derivation never emits (derivation tops out at `tested`). It must rank
// strictly above `tested` here so that deriving `tested` for an already
// `completed` work item is detected as a downgrade and blocked, preventing a
// `completed` -> `tested` regression on `work-items --apply`.
const STATUS_ORDER: Record<WorkItemStatus, number> = {
  drafted: 0,
  reflected: 1,
  implemented: 2,
  tested: 3,
  completed: 4,
};

function statusOrder(status: WorkItemStatus): number {
  return STATUS_ORDER[status];
}
