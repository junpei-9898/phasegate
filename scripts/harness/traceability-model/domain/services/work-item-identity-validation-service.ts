// @unit traceability-model
// @layer domain
// @work-item-id WI-106

import type { WorkItemIdentityEntry } from "../ports/work-item-identity-port.js";

export interface WorkItemIdentityViolation {
  readonly code: "duplicate-id" | "directory-id-mismatch";
  readonly workItemId: string;
  readonly filePaths: readonly string[];
  readonly message: string;
}

export class WorkItemIdentityValidationService {
  validate(entries: readonly WorkItemIdentityEntry[]): readonly WorkItemIdentityViolation[] {
    const violations: WorkItemIdentityViolation[] = [];
    const byId = new Map<string, WorkItemIdentityEntry[]>();

    for (const entry of entries) {
      if (entry.directoryId !== entry.frontmatterId) {
        violations.push({
          code: "directory-id-mismatch",
          workItemId: entry.frontmatterId,
          filePaths: Object.freeze([entry.filePath]),
          message: `WI directory id ${entry.directoryId} does not match frontmatter id ${entry.frontmatterId}: ${entry.filePath}`,
        });
      }

      const existing = byId.get(entry.frontmatterId) ?? [];
      existing.push(entry);
      byId.set(entry.frontmatterId, existing);
    }

    for (const [workItemId, sameIdEntries] of byId.entries()) {
      if (sameIdEntries.length <= 1) continue;
      violations.push({
        code: "duplicate-id",
        workItemId,
        filePaths: Object.freeze(sameIdEntries.map((entry) => entry.filePath).sort()),
        message: `WI id ${workItemId} is duplicated: ${sameIdEntries.map((entry) => entry.filePath).sort().join(", ")}`,
      });
    }

    return Object.freeze(violations);
  }
}
