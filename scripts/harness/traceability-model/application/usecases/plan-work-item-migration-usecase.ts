// @unit traceability-model
// @layer application

import type { WorkItemMigrationSourcePort } from "../../domain/ports/work-item-migration-source-port.js";
import { WorkItemMigrationPlanner } from "../../domain/services/work-item-migration-planner.js";
import type { WorkItemMigrationPlan } from "../../domain/value-objects/work-item-migration-candidate.js";

export interface PlanWorkItemMigrationUseCaseDeps {
  readonly sourcePort: WorkItemMigrationSourcePort;
  readonly planner?: WorkItemMigrationPlanner;
}

export class PlanWorkItemMigrationUseCase {
  private readonly sourcePort: WorkItemMigrationSourcePort;
  private readonly planner: WorkItemMigrationPlanner;

  constructor(deps: PlanWorkItemMigrationUseCaseDeps) {
    this.sourcePort = deps.sourcePort;
    this.planner = deps.planner ?? new WorkItemMigrationPlanner();
  }

  async execute(): Promise<WorkItemMigrationPlan> {
    const entries = await this.sourcePort.listLegacyIssueDirectories();
    return this.planner.plan(entries);
  }
}
