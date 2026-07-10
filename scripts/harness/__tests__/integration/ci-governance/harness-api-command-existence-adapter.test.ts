// @unit ci-governance
// @layer infrastructure
// @story WI-250
// @work-item-id WI-250

import { expect, it } from 'vitest';
import { HarnessApiCommandExistenceAdapter } from '../../../ci-governance/infrastructure/adapters/harness-api-command-existence-adapter.js';
import { KNOWN_HARNESS_COMMANDS } from '../../../harness-api/domain/value-objects/known-harness-commands.js';
import { context, target } from '../../helpers/test-helpers.js';

/**
 * WI-250: HarnessApiCommandExistenceAdapter のデフォルト known commands が
 * harness-api domain の canonical 定数 `KNOWN_HARNESS_COMMANDS` と一致することを検証する。
 * infra 側の独自ハードコードによる乖離（WI-247 の暫定リスト）を解消する回帰ゲート。
 */

target('HarnessApiCommandExistenceAdapter', () => {
  context('デフォルトコンストラクタで canonical 定数が配線される場合', () => {
    it('canonical 定数の全コマンドに対して exists が true を返す', async () => {
      // Arrange
      const adapter = new HarnessApiCommandExistenceAdapter();

      // Act
      const results = await Promise.all(
        KNOWN_HARNESS_COMMANDS.map((command) => adapter.exists(command)),
      );

      // Assert
      expect(KNOWN_HARNESS_COMMANDS.length).toBeGreaterThan(0);
      expect(results.every((exists) => exists === true)).toBe(true);
    });

    it('実在コマンド phasegate:status は true を返す', async () => {
      // Arrange
      const adapter = new HarnessApiCommandExistenceAdapter();

      // Act
      const exists = await adapter.exists('phasegate:status');

      // Assert
      expect(exists).toBe(true);
    });

    it('偽コマンドは false を返す', async () => {
      // Arrange
      const adapter = new HarnessApiCommandExistenceAdapter();

      // Act
      const exists = await adapter.exists('phasegate:no-such-command');

      // Assert
      expect(exists).toBe(false);
    });
  });

  context('コンストラクタ注入でリストを差し替える場合', () => {
    it('注入したコマンドのみ true を返し canonical 側は false になる', async () => {
      // Arrange
      const adapter = new HarnessApiCommandExistenceAdapter(['custom:only']);

      // Act
      const customExists = await adapter.exists('custom:only');
      const canonicalExists = await adapter.exists('phasegate:status');

      // Assert
      expect(customExists).toBe(true);
      expect(canonicalExists).toBe(false);
    });
  });
});
