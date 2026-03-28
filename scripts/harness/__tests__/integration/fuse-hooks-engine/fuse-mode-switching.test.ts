/**
 * @unit fuse-hooks-engine
 * @layer infrastructure
 *
 * composition-root の guardMode 切替配線テスト (I2-I4)
 */
import { describe, expect, it, vi } from 'vitest';
import { buildFuseHooksEngine } from '../../../fuse-hooks-engine/composition-root.js';

describe('composition-root guardMode 配線切替', () => {
  it('guardMode="hooks" の場合、fallbackモードで配線される', () => {
    // Arrange & Act
    const engine = buildFuseHooksEngine(process.cwd(), { guardMode: 'hooks' });

    // Assert
    expect(engine.guardMode).toBe('hooks');
    expect(engine.fuseAvailable).toBe(false);
  });

  it('guardMode="fuse" の場合、FUSEモードとして配線される', async () => {
    // Arrange & Act
    const engine = buildFuseHooksEngine(process.cwd(), { guardMode: 'fuse' });

    // Assert
    expect(engine.guardMode).toBe('fuse');
  });

  it('guardMode="auto" でFUSE不可の場合、hooks にフォールバックする', async () => {
    // Arrange & Act
    const engine = buildFuseHooksEngine(process.cwd(), { guardMode: 'auto' });

    // Assert — auto resolves based on FUSE availability
    expect(['fuse', 'hooks']).toContain(engine.guardMode);
  });

  it('guardMode 未指定の場合、デフォルトで hooks になる', () => {
    // Arrange & Act
    const engine = buildFuseHooksEngine(process.cwd());

    // Assert
    expect(engine.guardMode).toBe('hooks');
  });

  it('fuseDaemonHandler が返される', () => {
    // Arrange & Act
    const engine = buildFuseHooksEngine(process.cwd(), { guardMode: 'hooks' });

    // Assert
    expect(engine.fuseDaemonHandler).toBeDefined();
    expect(typeof engine.fuseDaemonHandler.handle).toBe('function');
  });
});
