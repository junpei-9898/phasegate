// @unit traceability-model
// @layer application
// @work-item-id WI-126

import type { WorkItemStatusPort } from "../../domain/ports/work-item-status-port.js";
import { WorkItemStatusDerivationService } from "../../domain/services/work-item-status-derivation-service.js";
import type { WorkItemStatusReport } from "../../domain/value-objects/work-item-status-report.js";

export interface DeriveWorkItemStatusUseCaseDeps {
  readonly workItemStatusPort: WorkItemStatusPort;
  readonly derivationService: WorkItemStatusDerivationService;
}

export class DeriveWorkItemStatusUseCase {
  private readonly workItemStatusPort: WorkItemStatusPort;
  private readonly derivationService: WorkItemStatusDerivationService;

  constructor(deps: DeriveWorkItemStatusUseCaseDeps) {
    this.workItemStatusPort = deps.workItemStatusPort;
    this.derivationService = deps.derivationService;
  }

  async execute(): Promise<readonly WorkItemStatusReport[]> {
    const inputs = await this.workItemStatusPort.listWorkItemStatusInputs();
    return Object.freeze(inputs.map((input) => this.derivationService.derive(input)));
  }
}
