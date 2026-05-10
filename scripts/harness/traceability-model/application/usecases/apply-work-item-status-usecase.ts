// @unit traceability-model
// @layer application
// @work-item-id WI-126

import type { WorkItemStatusPort } from "../../domain/ports/work-item-status-port.js";
import type { WorkItemStatusApplyResult } from "../../domain/value-objects/work-item-status-report.js";
import type { DeriveWorkItemStatusUseCase } from "./derive-work-item-status-usecase.js";

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

  async execute(input: { readonly id?: string } = {}): Promise<WorkItemStatusApplyResult> {
    const reports = await this.deriveWorkItemStatusUseCase.execute();
    const targetReports = input.id
      ? reports.filter((report) => report.id === input.id)
      : reports;
    return this.workItemStatusPort.applyDerivedStatuses(targetReports);
  }
}
