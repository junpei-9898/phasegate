// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CommandRegistry } from '../../../harness-api/domain/services/command-registry.js';
import { CliCommandDefinition } from '../../../harness-api/domain/value-objects/cli-command-definition.js';

function makeCommand(name: string) {
  return CliCommandDefinition.create(name);
}

target('CommandRegistry', () => {
  describe('registerCommand: 正常系', () => {
    // UT-CR-001
    it('phasegate:check-readyを登録できること', () => {
      // Arrange
      const registry = new CommandRegistry();
      const cmd = makeCommand('phasegate:check-ready');
      // Act
      registry.registerCommand(cmd);
      // Assert
      expect(registry.hasCommand('phasegate:check-ready')).toBe(true);
    });

    // UT-CR-002
    it('8コマンドを全て登録できること', () => {
      // Arrange
      const registry = new CommandRegistry();
      const commands = [
        'phasegate:check-ready', 'phasegate:check-phase', 'phasegate:ci-check',
        'phasegate:detect-drift', 'phasegate:status', 'phasegate:lint',
        'phasegate:complete-check', 'phasegate:impact-analysis',
      ];
      // Act
      for (const name of commands) {
        registry.registerCommand(makeCommand(name));
      }
      // Assert
      expect(registry.getCount()).toBe(8);
    });
  });

  describe('registerCommand: 重複登録エラー', () => {
    // UT-CR-003
    it('同一コマンド名を2回登録するとDuplicateCommandNameErrorをthrowすること', () => {
      // Arrange
      const registry = new CommandRegistry();
      registry.registerCommand(makeCommand('phasegate:check-ready'));
      // Act
      const actual = () => registry.registerCommand(makeCommand('phasegate:check-ready'));
      // Assert
      expect(actual).toThrow(/DuplicateCommandName/);
    });
  });

  describe('findByName: 正常系', () => {
    // UT-CR-004
    it('登録済みコマンドをfindByNameで取得できること', () => {
      // Arrange
      const registry = new CommandRegistry();
      registry.registerCommand(makeCommand('phasegate:check-ready'));
      // Act
      const actual = registry.findByName('phasegate:check-ready');
      // Assert
      expect(actual.commandName).toBe('phasegate:check-ready');
    });
  });

  describe('findByName: 未登録エラー', () => {
    // UT-CR-005
    it('未登録コマンドのfindByNameがCommandNotFoundErrorをthrowすること', () => {
      // Arrange
      const registry = new CommandRegistry();
      // Act
      const actual = () => registry.findByName('phasegate:check-ready');
      // Assert
      expect(actual).toThrow(/CommandNotFoundError/);
    });
  });

  describe('listAll: ソート順', () => {
    // UT-CR-006
    it('listAll()が登録コマンドをアルファベット昇順で返すこと', () => {
      // Arrange
      const registry = new CommandRegistry();
      registry.registerCommand(makeCommand('phasegate:status'));
      registry.registerCommand(makeCommand('phasegate:check-ready'));
      registry.registerCommand(makeCommand('phasegate:ci-check'));
      // Act
      const actual = registry.listAll();
      // Assert
      expect(actual[0].commandName).toBe('phasegate:check-ready');
      expect(actual[1].commandName).toBe('phasegate:ci-check');
      expect(actual[2].commandName).toBe('phasegate:status');
    });
  });

  describe('hasCommand: 存在確認', () => {
    // UT-CR-007
    it('登録済みコマンドでhasCommand=trueを返すこと', () => {
      // Arrange
      const registry = new CommandRegistry();
      registry.registerCommand(makeCommand('phasegate:check-ready'));
      // Act
      const actual = registry.hasCommand('phasegate:check-ready');
      // Assert
      expect(actual).toBe(true);
    });

    // UT-CR-008
    it('未登録コマンドでhasCommand=falseを返すこと', () => {
      // Arrange
      const registry = new CommandRegistry();
      // Act
      const actual = registry.hasCommand('phasegate:check-ready');
      // Assert
      expect(actual).toBe(false);
    });
  });
});
