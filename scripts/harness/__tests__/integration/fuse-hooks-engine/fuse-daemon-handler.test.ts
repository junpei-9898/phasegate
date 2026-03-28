/**
 * @unit fuse-hooks-engine
 * @layer presentation
 *
 * FuseDaemonHandler テスト (I5-I7)
 */
import { describe, expect, it } from 'vitest';
import { FUSEMount } from '../../../fuse-hooks-engine/domain/entities/fuse-mount.js';
import { FuseDaemonHandler } from '../../../fuse-hooks-engine/presentation/handlers/fuse-daemon-handler.js';

function createMockFuseHandler(shouldFail = false) {
  return {
    register: async () => {},
    dispatch: async () => {},
    isMounted: false,
    mount: async () => {
      if (shouldFail) throw new Error('FUSE not available');
    },
    unmount: async () => {},
  };
}

describe('FuseDaemonHandler', () => {
  describe('status サブコマンド (I7)', () => {
    it('hooksモードのステータスをJSON出力する', () => {
      // Arrange
      const fuseMount = FUSEMount.create('/tmp/test');
      fuseMount.enterFallback('L3');
      const handler = new FuseDaemonHandler({
        fuseMount,
        fuseWriteHandler: createMockFuseHandler(),
        fuseReadHandler: createMockFuseHandler(),
        guardMode: 'hooks',
      });

      // Act
      const result = handler.handle(['status']);

      // Assert
      expect(result).resolves.toEqual({
        output: expect.stringContaining('"guardMode": "hooks"'),
        exitCode: 0,
      });
    });

    it('fuseモードのステータスをJSON出力する', async () => {
      // Arrange
      const fuseMount = FUSEMount.create('/tmp/test');
      const handler = new FuseDaemonHandler({
        fuseMount,
        fuseWriteHandler: createMockFuseHandler(),
        fuseReadHandler: createMockFuseHandler(),
        guardMode: 'fuse',
      });

      // Act
      const result = await handler.handle(['status']);

      // Assert
      const parsed = JSON.parse(result.output);
      expect(parsed.guardMode).toBe('fuse');
      expect(parsed.mountStatus).toBe('unmounted');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('mount サブコマンド (I5)', () => {
    it('hooksモードではマウントを拒否する', async () => {
      // Arrange
      const fuseMount = FUSEMount.create('/tmp/test');
      const handler = new FuseDaemonHandler({
        fuseMount,
        fuseWriteHandler: createMockFuseHandler(),
        fuseReadHandler: createMockFuseHandler(),
        guardMode: 'hooks',
      });

      // Act
      const result = await handler.handle(['mount']);

      // Assert
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('hooks');
    });

    it('FUSE失敗時にフォールバックする', async () => {
      // Arrange
      const fuseMount = FUSEMount.create('/tmp/test');
      const handler = new FuseDaemonHandler({
        fuseMount,
        fuseWriteHandler: createMockFuseHandler(true),
        fuseReadHandler: createMockFuseHandler(),
        guardMode: 'fuse',
      });

      // Act
      const result = await handler.handle(['mount']);

      // Assert
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('FUSE mount failed');
      expect(result.output).toContain('Falling back');
      expect(fuseMount.isFallback()).toBe(true);
    });
  });

  describe('unmount サブコマンド (I6)', () => {
    it('アンマウントが成功する', async () => {
      // Arrange
      const fuseMount = FUSEMount.create('/tmp/test');
      const handler = new FuseDaemonHandler({
        fuseMount,
        fuseWriteHandler: createMockFuseHandler(),
        fuseReadHandler: createMockFuseHandler(),
        guardMode: 'fuse',
      });

      // Act
      const result = await handler.handle(['unmount']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('unmounted');
    });
  });

  describe('不正なサブコマンド', () => {
    it('不正なサブコマンドでexit code 2を返す', async () => {
      // Arrange
      const fuseMount = FUSEMount.create('/tmp/test');
      const handler = new FuseDaemonHandler({
        fuseMount,
        fuseWriteHandler: createMockFuseHandler(),
        fuseReadHandler: createMockFuseHandler(),
        guardMode: 'hooks',
      });

      // Act
      const result = await handler.handle(['invalid']);

      // Assert
      expect(result.exitCode).toBe(2);
    });
  });
});
