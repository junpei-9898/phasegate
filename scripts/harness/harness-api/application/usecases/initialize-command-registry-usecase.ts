// initialize-command-registry-usecase.ts — InitializeCommandRegistryUseCase

import { CliCommandDefinition } from '../../domain/value-objects/cli-command-definition.js';
import { CommandRegistry } from '../../domain/services/command-registry.js';
import type { InitializeRegistryInput } from '../dto/initialize-registry-input.js';
import type { RegistrySummaryOutput } from '../dto/registry-summary-output.js';

export interface InitializeCommandRegistryUseCaseDeps {
  registry: CommandRegistry;
}

export class InitializeCommandRegistryUseCase {
  private readonly registry: CommandRegistry;

  constructor(deps: InitializeCommandRegistryUseCaseDeps) {
    this.registry = deps.registry;
  }

  async execute(input: InitializeRegistryInput): Promise<RegistrySummaryOutput> {
    const failedRegistrations: { commandName: string; reason: string }[] = [];

    for (const cmdInput of input.commands) {
      // This may throw InvalidCommandNameError — let it propagate
      const definition = CliCommandDefinition.create(cmdInput.commandName, {
        description: cmdInput.description,
      });

      try {
        this.registry.registerCommand(definition);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        failedRegistrations.push({ commandName: cmdInput.commandName, reason });
      }
    }

    const allCommands = this.registry.listAll();
    return {
      registeredCount: allCommands.length,
      commandNames: allCommands.map((c) => c.commandName),
      failedRegistrations,
    };
  }
}
