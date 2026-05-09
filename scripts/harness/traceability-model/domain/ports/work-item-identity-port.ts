// @unit traceability-model
// @layer domain
// @work-item-id WI-106

export interface WorkItemIdentityEntry {
  readonly filePath: string;
  readonly directoryId: string;
  readonly frontmatterId: string;
}

export interface WorkItemIdentityPort {
  listWorkItemIdentities(): Promise<readonly WorkItemIdentityEntry[]>;
}
