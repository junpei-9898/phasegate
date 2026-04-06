// @layer domain
// command-registry.ts — CommandRegistry Domain Service

import { CliCommandDefinition, type CommandName } from '../value-objects/cli-command-definition.js';

export class CommandRegistry {
  private readonly commands: Map<string, CliCommandDefinition> = new Map();

  registerCommand(definition: CliCommandDefinition): void {
    // INV-2: phasegate: プレフィックス必須
    if (!definition.commandName || definition.commandName.trim() === '') {
      throw new Error('HarnessApiDomainError: commandName must not be empty');
    }
    if (!definition.commandName.startsWith('phasegate:')) {
      throw new Error(`DuplicateCommandNameError: commandName must start with 'phasegate:': ${definition.commandName}`);
    }
    // INV-1: 同一コマンド名の重複禁止
    if (this.commands.has(definition.commandName)) {
      throw new Error(`DuplicateCommandNameError: command '${definition.commandName}' is already registered`);
    }
    this.commands.set(definition.commandName, definition);
  }

  findByName(commandName: CommandName): CliCommandDefinition {
    const found = this.commands.get(commandName);
    if (!found) {
      throw new Error(`CommandNotFoundError: command '${commandName}' is not registered`);
    }
    return found;
  }

  listAll(): readonly CliCommandDefinition[] {
    return Object.freeze(
      Array.from(this.commands.values()).sort((a, b) => a.commandName.localeCompare(b.commandName))
    );
  }

  hasCommand(commandName: CommandName): boolean {
    return this.commands.has(commandName);
  }

  getCount(): number {
    return this.commands.size;
  }
}
