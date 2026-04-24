// @unit traceability-model
// @layer domain

export type WorkItemMigrationScope = "cross" | "unit";
export type WorkItemDescriptionFileName = "description.md" | "issue_description.md";

export interface LegacyIssueDirectory {
  readonly legacyId: string;
  readonly sourcePath: string;
  readonly scope: WorkItemMigrationScope;
  readonly unitName?: string;
  readonly descriptionFileName: WorkItemDescriptionFileName | null;
  readonly content: string;
  readonly targetExists: boolean;
}

export interface WorkItemMigrationCandidate {
  readonly legacyId: string;
  readonly nextId: string;
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly scope: WorkItemMigrationScope;
  readonly unitName?: string;
  readonly descriptionFileName: WorkItemDescriptionFileName | null;
  readonly conflict: boolean;
  readonly frontmatterPreview: string;
}

export interface WorkItemMigrationPlan {
  readonly candidates: readonly WorkItemMigrationCandidate[];
  readonly warnings: readonly string[];
}

export interface WorkItemMigrationAppliedCandidate {
  readonly legacyId: string;
  readonly nextId: string;
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly descriptionPath: string;
}

export interface WorkItemMigrationApplyResult {
  readonly applied: readonly WorkItemMigrationAppliedCandidate[];
  readonly skipped: readonly WorkItemMigrationCandidate[];
  readonly warnings: readonly string[];
  readonly blocked: boolean;
}
