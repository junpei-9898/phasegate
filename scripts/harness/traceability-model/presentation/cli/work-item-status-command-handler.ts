// @unit traceability-model
// @layer presentation
// @work-item-id WI-126 / WI-140

import type { ApplyWorkItemStatusUseCase } from "../../application/usecases/apply-work-item-status-usecase.js";
import type { DeriveWorkItemStatusUseCase } from "../../application/usecases/derive-work-item-status-usecase.js";
import type {
  WorkItemStatusApplyResult,
  WorkItemStatusReport,
} from "../../domain/value-objects/work-item-status-report.js";

export interface WorkItemStatusCommandInput {
  readonly dryRun?: boolean;
  readonly apply?: boolean;
  readonly json?: boolean;
  readonly failOnStale?: boolean;
  readonly allowDowngrade?: boolean;
  readonly changedOnly?: boolean;
  readonly id?: string;
}

export interface WorkItemStatusCommandOutput {
  readonly exitCode: 0 | 1 | 2;
  readonly text: string;
  readonly reports: readonly WorkItemStatusReport[];
}

export interface WorkItemStatusCommandHandlerDeps {
  readonly deriveWorkItemStatusUseCase: Pick<DeriveWorkItemStatusUseCase, "execute">;
  readonly applyWorkItemStatusUseCase: Pick<ApplyWorkItemStatusUseCase, "execute">;
}

export class WorkItemStatusCommandHandler {
  private readonly deriveWorkItemStatusUseCase: Pick<DeriveWorkItemStatusUseCase, "execute">;
  private readonly applyWorkItemStatusUseCase: Pick<ApplyWorkItemStatusUseCase, "execute">;

  constructor(deps: WorkItemStatusCommandHandlerDeps) {
    this.deriveWorkItemStatusUseCase = deps.deriveWorkItemStatusUseCase;
    this.applyWorkItemStatusUseCase = deps.applyWorkItemStatusUseCase;
  }

  async execute(input: WorkItemStatusCommandInput): Promise<Readonly<WorkItemStatusCommandOutput>> {
    if (input.apply && input.dryRun) {
      return Object.freeze({
        exitCode: 2,
        text: "Error: --dry-run and --apply cannot be used together",
        reports: Object.freeze([]),
      });
    }
    if (!input.apply && !input.dryRun) {
      return Object.freeze({
        exitCode: 2,
        text: "Error: either --dry-run or --apply is required",
        reports: Object.freeze([]),
      });
    }

    if (input.apply) {
      const result = await this.applyWorkItemStatusUseCase.execute({
        id: input.id,
        allowDowngrade: input.allowDowngrade,
        changedOnly: input.changedOnly,
      });
      const reports = Object.freeze([...result.updated, ...result.unchanged, ...result.blocked]);
      return Object.freeze({
        exitCode: result.blocked.length > 0 ? 1 : 0,
        text: input.json ? JSON.stringify(result, null, 2) : this.formatApply(result),
        reports,
      });
    }

    const allReports = await this.deriveWorkItemStatusUseCase.execute();
    const reports = input.id
      ? allReports.filter((report) => report.id === input.id)
      : allReports;
    const stale = reports.some((report) => report.stale);
    return Object.freeze({
      exitCode: stale && input.failOnStale ? 1 : 0,
      text: input.json ? JSON.stringify({ reports }, null, 2) : this.formatReports(reports),
      reports,
    });
  }

  private formatReports(reports: readonly WorkItemStatusReport[]): string {
    const lines = ["Work item status report"];
    for (const report of reports) {
      const marker = report.stale ? "STALE" : "OK";
      lines.push(
        `[${marker}] ${report.id}: current=${report.currentStatus} derived=${report.derivedStatus}`,
        `  path: ${report.descriptionPath}`,
        `  reason: ${report.reason}`,
        `  next: ${report.nextAction}`,
      );
    }
    return lines.join("\n");
  }

  private formatApply(result: WorkItemStatusApplyResult): string {
    const lines = ["Work item status apply"];
    for (const report of result.updated) {
      lines.push(`updated ${report.id}: ${report.currentStatus} -> ${report.derivedStatus}`);
    }
    if (result.updated.length === 0) {
      lines.push("no updates required");
    }
    for (const report of result.blocked) {
      lines.push(`blocked ${report.id}: ${report.currentStatus} -> ${report.derivedStatus} requires --allow-downgrade`);
    }
    lines.push(`unchanged: ${result.unchanged.length}`);
    return lines.join("\n");
  }
}
