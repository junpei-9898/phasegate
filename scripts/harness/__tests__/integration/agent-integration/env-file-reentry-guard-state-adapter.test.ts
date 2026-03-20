// @unit agent-integration
// @layer infrastructure
// @story H11-04

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { EnvFileReentryGuardStateAdapter } from '../../../agent-integration/infrastructure/adapters/env-file-reentry-guard-state-adapter.js';

beforeEach(async () => {
  delete process.env['HARNESS_STOP_HOOK_ACTIVE'];
});

afterEach(async () => {
  const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });
  await adapter.clearActive();
});

target('EnvFileReentryGuardStateAdapter', () => {
  describe('env 戦略での状態管理', () => {
    context('環境変数が未設定の場合', () => {
      // IT-REPO-EnvFileAdapter-001
      it('readActive（未設定状態）がfalseを返すこと', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });

        // Act
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('writeActive 実行後', () => {
      // IT-REPO-EnvFileAdapter-002
      it('writeActive → readActive でtrueが返ること', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });

        // Act
        await adapter.writeActive();
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('writeActive → clearActive 実行後', () => {
      // IT-REPO-EnvFileAdapter-003
      it('writeActive → clearActive → readActive でfalseが返ること', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });

        // Act
        await adapter.writeActive();
        await adapter.clearActive();
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('未設定状態でclearActiveを呼んだ場合（冪等性）', () => {
      // IT-REPO-EnvFileAdapter-004
      it('clearActive（未設定状態での冪等性）がエラーなく完了すること', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });

        // Act
        await adapter.clearActive();
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('file 戦略での状態管理', () => {
    context('tmpファイルが存在しない場合', () => {
      // IT-REPO-EnvFileAdapter-005
      it('readActive（tmpファイルなし）がfalseを返すこと', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'file' });
        await adapter.clearActive(); // 事前クリーンアップ

        // Act
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('writeActive 実行後', () => {
      // IT-REPO-EnvFileAdapter-006
      it('writeActive → readActive でtrueが返ること（tmpファイル作成）', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'file' });
        await adapter.clearActive(); // 事前クリーンアップ

        // Act
        await adapter.writeActive();
        const actual = await adapter.readActive();

        // Cleanup
        await adapter.clearActive();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('writeActive → clearActive 実行後', () => {
      // IT-REPO-EnvFileAdapter-007
      it('writeActive → clearActive → readActive でfalseが返ること（tmpファイル削除）', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'file' });

        // Act
        await adapter.writeActive();
        await adapter.clearActive();
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('ファイルなし状態でclearActiveを呼んだ場合（冪等性）', () => {
      // IT-REPO-EnvFileAdapter-008
      it('clearActive（ファイルなし状態での冪等性）がエラーなく完了すること', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'file' });
        await adapter.clearActive(); // 事前クリーンアップ

        // Act & Assert（例外が発生しないこと）
        await expect(adapter.clearActive()).resolves.not.toThrow();
      });
    });
  });

  context('readActiveがI/Oエラー時に安全側に倒す場合（env戦略ではN/A、統合検証のみ）', () => {
    // IT-REPO-EnvFileAdapter-009（env戦略ではI/Oエラー不発生のため、readがfalseであることを確認）
    it('env戦略でreadActiveが常にboolean型を返すこと', async () => {
      // Arrange
      const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });

      // Act
      const actual = await adapter.readActive();

      // Assert
      expect(typeof actual).toBe('boolean');
    });
  });

  context('writeActiveが正常に完了する場合', () => {
    // IT-REPO-EnvFileAdapter-010
    it('writeActiveが正常完了すること', async () => {
      // Arrange
      const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });

      // Act & Assert
      await expect(adapter.writeActive()).resolves.not.toThrow();

      // Cleanup
      await adapter.clearActive();
    });
  });
});
