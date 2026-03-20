/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

export const actionTypes = [
  'block-write',
  'allow-read',
  'run-shell',
  'trigger-completion-check',
] as const;

export type ActionType = (typeof actionTypes)[number];

export const isActionType = (value: string): value is ActionType =>
  actionTypes.includes(value as ActionType);
