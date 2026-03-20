/**
 * @layer domain
 * @unit quick-mode
 *
 * 変更種別を表す列挙型
 */

export type ChangeKind = 'CREATE' | 'MODIFY' | 'DELETE';

export const CHANGE_KINDS: readonly ChangeKind[] = ['CREATE', 'MODIFY', 'DELETE'] as const;

export function isChangeKind(value: string): value is ChangeKind {
  return CHANGE_KINDS.includes(value as ChangeKind);
}
