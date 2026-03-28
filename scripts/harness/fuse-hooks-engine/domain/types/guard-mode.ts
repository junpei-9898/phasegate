/**
 * @layer domain
 * @unit fuse-hooks-engine
 *
 * GuardMode — FUSE/Hooks モード切替の型定義
 */

export const GUARD_MODES = ['fuse', 'hooks', 'auto'] as const;

export type GuardMode = (typeof GUARD_MODES)[number];

export function isGuardMode(value: unknown): value is GuardMode {
  return typeof value === 'string' && GUARD_MODES.includes(value as GuardMode);
}
