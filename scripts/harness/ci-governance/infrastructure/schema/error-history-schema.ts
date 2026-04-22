// @unit ci-governance
// @layer infrastructure

export interface ErrorHistoryEntry {
  readonly code: string;
  readonly occurrenceCount: number;
  readonly escalated: boolean;
  readonly threshold: number;
}

export interface ErrorHistoryJson {
  readonly version: '1.0';
  readonly entries: ErrorHistoryEntry[];
}
