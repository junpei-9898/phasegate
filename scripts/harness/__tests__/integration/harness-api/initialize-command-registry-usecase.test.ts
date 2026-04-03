import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { InitializeCommandRegistryUseCase } from '../../../harness-api/application/usecases/initialize-command-registry-usecase.js';
import { CommandRegistry } from '../../../harness-api/domain/services/command-registry.js';

function buildDefaultCliCommandDefinitions() {
  return [
    { commandName: 'phasegate:check-ready', description: 'check ready' },
    { commandName: 'phasegate:check-phase', description: 'check phase' },
    { commandName: 'phasegate:ci-check', description: 'ci check' },
    { commandName: 'phasegate:detect-drift', description: 'detect drift' },
    { commandName: 'phasegate:status', description: 'status' },
    { commandName: 'phasegate:lint', description: 'lint' },
    { commandName: 'phasegate:complete-check', description: 'complete check' },
    { commandName: 'phasegate:impact-analysis', description: 'impact analysis' },
  ];
}

target('InitializeCommandRegistryUseCase.execute', () => {
  // ─── IT-UC-InitRegistry-001 ───
  describe('8コマンドを一括登録できること', () => {
    context('正常な8コマンドのCliCommandDefinitionInput配列を渡した場合', () => {
      it('registeredCount=8かつfailedRegistrations=[]が返される', async () => {
        // Arrange
        const registry = new CommandRegistry();
        const useCase = new InitializeCommandRegistryUseCase({ registry });
        const commands = buildDefaultCliCommandDefinitions();

        // Act
        const actual = await useCase.execute({ commands });

        // Assert
        expect(actual.registeredCount).toBe(8);
        expect(actual.failedRegistrations).toHaveLength(0);
        expect(actual.commandNames).toHaveLength(8);
      });
    });
  });

  // ─── IT-UC-InitRegistry-002 ───
  describe('登録済みコマンド名が昇順で返されること', () => {
    context('順序不定の8コマンド配列を渡した場合', () => {
      it('commandNamesがアルファベット昇順で返される', async () => {
        // Arrange
        const registry = new CommandRegistry();
        const useCase = new InitializeCommandRegistryUseCase({ registry });
        const commands = buildDefaultCliCommandDefinitions().reverse();

        // Act
        const actual = await useCase.execute({ commands });

        // Assert
        const sorted = [...actual.commandNames].sort();
        expect(actual.commandNames).toEqual(sorted);
        expect(actual.commandNames[0]).toBe('phasegate:check-phase');
        expect(actual.commandNames[1]).toBe('phasegate:check-ready');
      });
    });
  });

  // ─── IT-UC-InitRegistry-003 ───
  describe('重複コマンド名がある場合の挙動', () => {
    context('同一commandNameのInputを2件含む配列（計9件）を渡した場合', () => {
      it('成功した8件はregisteredCountに反映され、failedRegistrationsに1件記録される', async () => {
        // Arrange
        const registry = new CommandRegistry();
        const useCase = new InitializeCommandRegistryUseCase({ registry });
        const commands = [
          ...buildDefaultCliCommandDefinitions(),
          { commandName: 'phasegate:check-ready', description: '重複' },
        ];

        // Act
        const actual = await useCase.execute({ commands });

        // Assert
        expect(actual.registeredCount).toBe(8);
        expect(actual.failedRegistrations).toHaveLength(1);
        expect(actual.failedRegistrations[0].commandName).toBe('phasegate:check-ready');
        expect(actual.failedRegistrations[0].reason).toMatch(/DuplicateCommandName/i);
      });
    });
  });

  // ─── IT-UC-InitRegistry-004 ───
  describe('phasegate:プレフィックスのないコマンド名はエラーになること', () => {
    context("commandName='invalid-cmd'を渡した場合", () => {
      it('InvalidCommandNameErrorがスローされる', async () => {
        // Arrange
        const registry = new CommandRegistry();
        const useCase = new InitializeCommandRegistryUseCase({ registry });
        const commands = [
          { commandName: 'invalid-cmd', description: 'プレフィックスなし' },
        ];

        // Act & Assert
        await expect(useCase.execute({ commands })).rejects.toThrow('InvalidCommandNameError');
      });
    });
  });

  // ─── IT-UC-InitRegistry-005 ───
  describe('空配列の場合、正常完了すること', () => {
    context('commands=[]を渡した場合', () => {
      it('registeredCount=0・commandNames=[]・failedRegistrations=[]が返される', async () => {
        // Arrange
        const registry = new CommandRegistry();
        const useCase = new InitializeCommandRegistryUseCase({ registry });

        // Act
        const actual = await useCase.execute({ commands: [] });

        // Assert
        expect(actual.registeredCount).toBe(0);
        expect(actual.commandNames).toEqual([]);
        expect(actual.failedRegistrations).toEqual([]);
      });
    });
  });
});
