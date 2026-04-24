// @unit traceability-model
// @layer domain
/**
 * WorkItemFrontmatter — 設計文書 frontmatter から抽出した WI メタデータ（H03-04 / ISSUE-026 Phase A-2）。
 *
 * 既存 `parseFrontmatterFlags` (initial_creation) とは独立した型系統で、
 * WI 一本化の識別と type 別振る舞いの基盤を提供する。
 */

export type WorkItemType = 'story' | 'issue' | 'fix' | 'refactor' | 'chore';
export type WorkItemSeverity = 'trivial' | 'normal' | 'high';
export type WorkItemStatus =
  | 'drafted'
  | 'reflected'
  | 'implemented'
  | 'tested';

export interface WorkItemFrontmatter {
  readonly id: string;
  readonly type: WorkItemType;
  readonly affects?: readonly string[];
  readonly severity?: WorkItemSeverity;
  readonly status?: WorkItemStatus;
  readonly source?: string;
  readonly legacyId?: string;
}

export class WorkItemFrontmatterValidationError extends Error {
  constructor(reason: string) {
    super(`WorkItem frontmatter が不正です: ${reason}`);
    this.name = 'WorkItemFrontmatterValidationError';
  }
}

export const WORK_ITEM_ID_PATTERN =
  /^(?:WI-\d+|H(?:\d{2}|F\d+)-\d{2}|ISSUE-\d+)$/;

export const WORK_ITEM_TYPES: ReadonlySet<WorkItemType> = new Set([
  'story',
  'issue',
  'fix',
  'refactor',
  'chore',
]);

export const WORK_ITEM_SEVERITIES: ReadonlySet<WorkItemSeverity> = new Set([
  'trivial',
  'normal',
  'high',
]);

export const WORK_ITEM_STATUSES: ReadonlySet<WorkItemStatus> = new Set([
  'drafted',
  'reflected',
  'implemented',
  'tested',
]);
