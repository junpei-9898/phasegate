/**
 * @layer test
 * @unit validator-system
 * @story H08-09
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { CliCommandRegistryAdapter } from '../../../../validator-system/infrastructure/adapters/cli-command-registry-adapter.js';

target('CliCommandRegistryAdapter', () => {

  describe('getRegisteredCommands()', () => {

    context('commandsオプションが未指定のとき', () => {
      it('空配列を返すこと (IT-VS-TA-CLI-01)', async () => {
        // Arrange
        const adapter = new CliCommandRegistryAdapter();
        // Act
        const actual = await adapter.getRegisteredCommands();
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('commandsオプションに2件設定した場合', () => {
      it('設定したコマンド一覧を返すこと (IT-VS-TA-CLI-02)', async () => {
        // Arrange
        const adapter = new CliCommandRegistryAdapter({ commands: ['ci:check', 'lint'] });
        // Act
        const actual = await adapter.getRegisteredCommands();
        // Assert
        expect(actual).toHaveLength(2);
        expect(actual).toContain('ci:check');
        expect(actual).toContain('lint');
      });
    });

    context('commandsオプションに空配列を設定した場合', () => {
      it('空配列を返すこと (IT-VS-TA-CLI-03)', async () => {
        // Arrange
        const adapter = new CliCommandRegistryAdapter({ commands: [] });
        // Act
        const actual = await adapter.getRegisteredCommands();
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

  });

});

// @story-id H08-07