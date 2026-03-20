/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * CommandExistencePort実装
 */

import type { CommandExistencePort } from '../../domain/ports/command-existence-port.js';

export class HarnessApiCommandExistenceAdapter implements CommandExistencePort {
  private readonly knownCommands: Set<string>;

  constructor(knownCommands: string[] = []) {
    this.knownCommands = new Set(knownCommands);
  }

  async exists(command: string): Promise<boolean> {
    return this.knownCommands.has(command);
  }
}
