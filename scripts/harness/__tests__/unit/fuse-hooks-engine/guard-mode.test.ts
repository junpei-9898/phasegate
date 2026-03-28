/**
 * @unit fuse-hooks-engine
 * @layer domain
 *
 * GuardMode 型のユニットテスト
 */
import { describe, expect, it } from 'vitest';
import { isGuardMode, type GuardMode, GUARD_MODES } from '../../../fuse-hooks-engine/domain/types/guard-mode.js';

describe('GuardMode', () => {
  it('「fuse」を有効なGuardModeとして受容する', () => {
    expect(isGuardMode('fuse')).toBe(true);
  });

  it('「hooks」を有効なGuardModeとして受容する', () => {
    expect(isGuardMode('hooks')).toBe(true);
  });

  it('「auto」を有効なGuardModeとして受容する', () => {
    expect(isGuardMode('auto')).toBe(true);
  });

  it('不正な値を拒否する', () => {
    expect(isGuardMode('invalid')).toBe(false);
    expect(isGuardMode('')).toBe(false);
    expect(isGuardMode('FUSE')).toBe(false);
    expect(isGuardMode(123)).toBe(false);
    expect(isGuardMode(null)).toBe(false);
    expect(isGuardMode(undefined)).toBe(false);
  });

  it('GUARD_MODES定数が全3モードを含む', () => {
    expect(GUARD_MODES).toEqual(['fuse', 'hooks', 'auto']);
  });

  it('型としてGuardModeが利用できる', () => {
    const mode: GuardMode = 'fuse';
    expect(isGuardMode(mode)).toBe(true);
  });
});
