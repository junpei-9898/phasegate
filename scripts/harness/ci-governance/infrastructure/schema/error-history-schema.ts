/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * .harness/error-history.json スキーマ定義
 */

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
