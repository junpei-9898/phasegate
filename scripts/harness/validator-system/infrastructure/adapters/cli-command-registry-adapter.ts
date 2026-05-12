// @unit validator-system
// @layer infrastructure
// @work-item-id WI-111

import type { CliCommandRegistryPort } from '../../domain/ports/cli-command-registry-port.js';

export interface CliCommandRegistryAdapterOptions {
  readonly commands?: readonly string[];
}

export class CliCommandRegistryAdapter implements CliCommandRegistryPort {
  private readonly commands: readonly string[];

  constructor(options: CliCommandRegistryAdapterOptions = {}) {
    this.commands = options.commands ?? [];
  }

  async getRegisteredCommands(): Promise<readonly string[]> {
    return this.commands;
  }
}

// @story-id H08-07
