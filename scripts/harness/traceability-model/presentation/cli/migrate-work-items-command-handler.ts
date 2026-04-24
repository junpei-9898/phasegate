// @unit traceability-model
// @layer presentation

import type { ApplyWorkItemMigrationUseCase } from "../../application/usecases/apply-work-item-migration-usecase.js";
import type { PlanWorkItemMigrationUseCase } from "../../application/usecases/plan-work-item-migration-usecase.js";
import type {
  WorkItemMigrationApplyResult,
  WorkItemMigrationCandidate,
  WorkItemMigrationPlan,
} from "../../domain/value-objects/work-item-migration-candidate.js";

export interface MigrateWorkItemsCommandInput {
  readonly dryRun?: boolean;
  readonly apply?: boolean;
  readonly json?: boolean;
}

export interface MigrateWorkItemsCommandOutput {
  readonly exitCode: 0 | 1 | 2;
  readonly text: string;
}

type PlanUseCase = Pick<PlanWorkItemMigrationUseCase, "execute">;
type ApplyUseCase = Pick<ApplyWorkItemMigrationUseCase, "execute">;

export interface MigrateWorkItemsCommandHandlerDeps {
  readonly planWorkItemMigrationUseCase: PlanUseCase;
  readonly applyWorkItemMigrationUseCase?: ApplyUseCase;
}

export class MigrateWorkItemsCommandHandler {
  private readonly planUseCase: PlanUseCase;
  private readonly applyUseCase?: ApplyUseCase;

  constructor(deps: MigrateWorkItemsCommandHandlerDeps) {
    this.planUseCase = deps.planWorkItemMigrationUseCase;
    this.applyUseCase = deps.applyWorkItemMigrationUseCase;
  }

  async execute(input: MigrateWorkItemsCommandInput): Promise<Readonly<MigrateWorkItemsCommandOutput>> {
    if (input.apply && input.dryRun) {
      return Object.freeze({
        exitCode: 2,
        text: "Error: --apply and --dry-run cannot be used together.",
      });
    }

    if (input.apply) {
      return this.executeApply(input);
    }

    if (!input.dryRun) {
      return Object.freeze({
        exitCode: 2,
        text: "Error: either --dry-run or --apply is required for migrate work-items.",
      });
    }

    try {
      const plan = await this.planUseCase.execute();
      const hasConflict = plan.candidates.some((candidate) => candidate.conflict);
      return Object.freeze({
        exitCode: hasConflict ? 1 : 0,
        text: input.json ? this.formatJson(plan) : this.formatHuman(plan),
      });
    } catch {
      return Object.freeze({
        exitCode: 2,
        text: "Error: failed to plan work item migration unexpectedly.",
      });
    }
  }

  private formatJson(plan: WorkItemMigrationPlan): string {
    return JSON.stringify(
      {
        candidates: plan.candidates,
        warnings: plan.warnings,
      },
      null,
      2,
    );
  }

  private async executeApply(input: MigrateWorkItemsCommandInput): Promise<Readonly<MigrateWorkItemsCommandOutput>> {
    if (!this.applyUseCase) {
      return Object.freeze({
        exitCode: 2,
        text: "Error: --apply is not configured for migrate work-items.",
      });
    }

    try {
      const result = await this.applyUseCase.execute();
      return Object.freeze({
        exitCode: result.blocked ? 1 : 0,
        text: input.json ? this.formatApplyJson(result) : this.formatApplyHuman(result),
      });
    } catch {
      return Object.freeze({
        exitCode: 2,
        text: "Error: failed to apply work item migration unexpectedly.",
      });
    }
  }

  private formatApplyJson(result: WorkItemMigrationApplyResult): string {
    return JSON.stringify(
      {
        applied: result.applied,
        skipped: result.skipped,
        warnings: result.warnings,
        blocked: result.blocked,
      },
      null,
      2,
    );
  }

  private formatApplyHuman(result: WorkItemMigrationApplyResult): string {
    const lines = [
      "WorkItem migration apply",
      `applied: ${result.applied.length}`,
      `skipped: ${result.skipped.length}`,
      `warnings: ${result.warnings.length}`,
      `blocked: ${result.blocked ? "yes" : "no"}`,
      "",
    ];

    for (const applied of result.applied) {
      lines.push(`- applied ${applied.legacyId} -> ${applied.nextId}`);
      lines.push(`  target: ${applied.targetPath}`);
      lines.push(`  description: ${applied.descriptionPath}`);
      lines.push("");
    }

    for (const skipped of result.skipped) {
      lines.push(`- skipped ${skipped.legacyId} -> ${skipped.nextId}`);
      lines.push(`  reason: conflict`);
      lines.push(`  target: ${skipped.targetPath}`);
      lines.push("");
    }

    if (result.warnings.length > 0) {
      lines.push("Warnings:");
      for (const warning of result.warnings) {
        lines.push(`  - ${warning}`);
      }
    }

    return lines.join("\n").trimEnd();
  }

  private formatHuman(plan: WorkItemMigrationPlan): string {
    const lines = [
      "WorkItem migration dry-run",
      `candidates: ${plan.candidates.length}`,
      `warnings: ${plan.warnings.length}`,
      "",
    ];

    for (const candidate of plan.candidates) {
      lines.push(...this.formatCandidate(candidate), "");
    }

    if (plan.warnings.length > 0) {
      lines.push("Warnings:");
      for (const warning of plan.warnings) {
        lines.push(`  - ${warning}`);
      }
    }

    return lines.join("\n").trimEnd();
  }

  private formatCandidate(candidate: WorkItemMigrationCandidate): string[] {
    return [
      `- ${candidate.legacyId} -> ${candidate.nextId}`,
      `  source: ${candidate.sourcePath}`,
      `  target: ${candidate.targetPath}`,
      `  scope: ${candidate.scope}`,
      `  description: ${candidate.descriptionFileName ?? "missing"}`,
      `  conflict: ${candidate.conflict ? "yes" : "no"}`,
    ];
  }
}
