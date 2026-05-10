/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-140
 */

import { createTraceabilityModelModule } from "../../../traceability-model/composition-root.js";
import type { WorkItemStatusPolicyPort } from "../../domain/ports/work-item-status-policy-port.js";
import type { WorkItemStatusReport } from "../../../traceability-model/domain/value-objects/work-item-status-report.js";

export class TraceabilityWorkItemStatusPolicyAdapter implements WorkItemStatusPolicyPort {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async findStaleReports(targetPaths: readonly string[] = []): Promise<readonly WorkItemStatusReport[]> {
    if (targetPaths.length === 0) return Object.freeze([]);

    const traceability = createTraceabilityModelModule(this.rootDir);
    const output = await traceability.workItemStatusCommandHandler.execute({ dryRun: true });
    const staleReports = output.reports.filter(
      (report) => report.stale && report.evidence.hasRequiredInceptionArtifacts,
    );

    const normalizedTargets = targetPaths.map((targetPath) => targetPath.replace(/^\.\//, ""));
    const explicitlyTargetedWorkItems = this.extractTargetedWorkItemIds(normalizedTargets);
    if (explicitlyTargetedWorkItems.size > 0) {
      return Object.freeze(staleReports.filter((report) => explicitlyTargetedWorkItems.has(report.id)));
    }
    return Object.freeze(staleReports.filter((report) => this.matchesAnyTarget(report, normalizedTargets)));
  }

  private extractTargetedWorkItemIds(targetPaths: readonly string[]): ReadonlySet<string> {
    const ids = new Set<string>();
    for (const targetPath of targetPaths) {
      const match = /^docs\/inception\/.+\/(WI-\d+)\/description\.md$/.exec(targetPath);
      if (match) ids.add(match[1]);
    }
    return ids;
  }

  private matchesAnyTarget(report: WorkItemStatusReport, targetPaths: readonly string[]): boolean {
    const evidencePaths = [
      report.descriptionPath,
      ...report.evidence.implementationPaths,
      ...report.evidence.testPaths,
    ];
    return targetPaths.some((targetPath) => evidencePaths.some((evidencePath) => evidencePath === targetPath));
  }
}
