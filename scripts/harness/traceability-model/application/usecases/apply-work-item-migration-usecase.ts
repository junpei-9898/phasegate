// @unit traceability-model
// @layer application

import type { WorkItemMigrationApplyPort } from "../../domain/ports/work-item-migration-apply-port.js";
import type {
  WorkItemMigrationAppliedCandidate,
  WorkItemMigrationApplyResult,
  WorkItemMigrationCandidate,
} from "../../domain/value-objects/work-item-migration-candidate.js";
import type { PlanWorkItemMigrationUseCase } from "./plan-work-item-migration-usecase.js";

type PlanUseCase = Pick<PlanWorkItemMigrationUseCase, "execute">;

export interface ApplyWorkItemMigrationUseCaseDeps {
  readonly planWorkItemMigrationUseCase: PlanUseCase;
  readonly applyPort: WorkItemMigrationApplyPort;
}

export class ApplyWorkItemMigrationUseCase {
  private readonly planUseCase: PlanUseCase;
  private readonly applyPort: WorkItemMigrationApplyPort;

  constructor(deps: ApplyWorkItemMigrationUseCaseDeps) {
    this.planUseCase = deps.planWorkItemMigrationUseCase;
    this.applyPort = deps.applyPort;
  }

  async execute(): Promise<WorkItemMigrationApplyResult> {
    const plan = await this.planUseCase.execute();
    const conflicts = plan.candidates.filter((candidate) => candidate.conflict);
    if (conflicts.length > 0) {
      return Object.freeze({
        applied: Object.freeze([]),
        skipped: Object.freeze(conflicts),
        warnings: plan.warnings,
        blocked: true,
      });
    }

    const applied: WorkItemMigrationAppliedCandidate[] = [];
    for (const candidate of plan.candidates) {
      applied.push(await this.applyPort.apply(candidate));
    }

    return Object.freeze({
      applied: Object.freeze(applied),
      skipped: Object.freeze([] as WorkItemMigrationCandidate[]),
      warnings: plan.warnings,
      blocked: false,
    });
  }
}
