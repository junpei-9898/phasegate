// @unit traceability-model
// @layer domain
// @work-item-id WI-126 / WI-140

import type { WorkItemStatus } from "../value-objects/work-item-frontmatter.js";
import type {
  WorkItemStatusInput,
  WorkItemStatusReport,
} from "../value-objects/work-item-status-report.js";

const ORDER: Record<WorkItemStatus, number> = {
  drafted: 0,
  reflected: 1,
  implemented: 2,
  tested: 3,
  completed: 3,
};

export class WorkItemStatusDerivationService {
  derive(input: WorkItemStatusInput): WorkItemStatusReport {
    const derivedStatus = this.deriveStatus(input);
    const currentStatus = input.frontmatter.status ?? "drafted";
    const reason = this.reasonFor(input, derivedStatus);
    const nextAction = this.nextActionFor(input, derivedStatus);

    return Object.freeze({
      id: input.frontmatter.id,
      type: input.frontmatter.type,
      descriptionPath: input.descriptionPath,
      currentStatus,
      derivedStatus,
      stale: currentStatus !== derivedStatus,
      reason,
      nextAction,
      evidence: Object.freeze({
        hasRequiredInceptionArtifacts: this.hasRequiredInceptionArtifacts(input),
        missingInceptionArtifacts: Object.freeze([...this.missingInceptionArtifacts(input)]),
        reflectedUnits: Object.freeze([...this.reflectedUnits(input)]),
        missingReflectionUnits: Object.freeze([...this.missingReflectionUnits(input)]),
        implementationPaths: Object.freeze([...input.implementationPaths]),
        testPaths: Object.freeze([...input.testPaths]),
        missingImplementation: this.missingImplementation(input),
        missingTests: this.missingTests(input),
        validation: Object.freeze({
          state: "not-run" as const,
          source: "work-items:status",
          blockingValidation: Object.freeze([]),
        }),
      }),
    });
  }

  private deriveStatus(input: WorkItemStatusInput): WorkItemStatus {
    const type = input.frontmatter.type;
    if (type === "chore") return "drafted";

    const reflected = this.missingReflectionUnits(input).length === 0;
    const implemented = input.implementationPaths.length > 0;
    const tested = input.testPaths.length > 0;

    if (type === "fix") {
      if (implemented) return "implemented";
      if (reflected) return "reflected";
      return "drafted";
    }

    if (!reflected) return "drafted";
    if (!implemented) return "reflected";
    if (tested) return "tested";
    return "implemented";
  }

  private reasonFor(input: WorkItemStatusInput, status: WorkItemStatus): string {
    if (!this.hasRequiredInceptionArtifacts(input)) {
      return `missing inception artifacts: ${this.missingInceptionArtifacts(input).join(", ")}`;
    }
    if (status === "tested") return "test evidence with @work-item-id exists";
    if (status === "implemented") return "implementation evidence with @work-item-id exists";
    if (status === "reflected") return "all affected units have product reflection";
    if (input.frontmatter.type === "chore") return "chore work items complete at drafted";
    return "product reflection is not complete";
  }

  private nextActionFor(input: WorkItemStatusInput, status: WorkItemStatus): string {
    const missingArtifacts = this.missingInceptionArtifacts(input);
    if (missingArtifacts.length > 0) {
      return `create inception artifacts: ${missingArtifacts.join(", ")}`;
    }
    const missingUnits = this.missingReflectionUnits(input);
    if (missingUnits.length > 0) {
      return `reflect @work-item-id ${input.frontmatter.id} in product docs for: ${missingUnits.join(", ")}`;
    }
    if (input.frontmatter.type === "chore") return "no further status transition required";
    if (status === "reflected") return `add implementation annotated with @work-item-id ${input.frontmatter.id}`;
    if (status === "implemented" && input.frontmatter.type !== "fix") {
      return `add tests annotated with @work-item-id ${input.frontmatter.id}`;
    }
    return "status is up to date";
  }

  private hasRequiredInceptionArtifacts(input: WorkItemStatusInput): boolean {
    return this.missingInceptionArtifacts(input).length === 0;
  }

  private missingInceptionArtifacts(input: WorkItemStatusInput): readonly string[] {
    const existing = new Set(input.existingInceptionArtifacts);
    return input.requiredInceptionArtifacts.filter((artifact) => !existing.has(artifact));
  }

  private reflectedUnits(input: WorkItemStatusInput): readonly string[] {
    const reflected = new Set<string>();
    for (const filePath of input.productReflectionPaths) {
      const unit = this.extractConstructionUnit(filePath);
      if (unit) reflected.add(unit);
    }
    return input.affectedUnits.filter((unit) => reflected.has(unit));
  }

  private missingReflectionUnits(input: WorkItemStatusInput): readonly string[] {
    if (input.frontmatter.type === "chore") return [];
    const reflected = new Set(this.reflectedUnits(input));
    return input.affectedUnits.filter((unit) => !reflected.has(unit));
  }

  private missingImplementation(input: WorkItemStatusInput): boolean {
    return input.frontmatter.type !== "chore" && this.missingReflectionUnits(input).length === 0 && input.implementationPaths.length === 0;
  }

  private missingTests(input: WorkItemStatusInput): boolean {
    return input.frontmatter.type !== "chore" && input.frontmatter.type !== "fix" && input.implementationPaths.length > 0 && input.testPaths.length === 0;
  }

  private extractConstructionUnit(filePath: string): string | null {
    const match = /^docs\/product\/construction\/([^/]+)\//.exec(filePath);
    return match?.[1] ?? null;
  }
}
