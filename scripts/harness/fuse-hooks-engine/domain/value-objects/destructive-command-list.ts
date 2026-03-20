/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import type { DestructiveCommandPattern } from '../types/destructive-command-pattern.js';
import { FuseHooksEngineDomainError } from '../errors/fuse-hooks-engine-domain-error.js';
import { Result } from '../result.js';

export class DestructiveCommandList {
  private constructor(readonly commands: readonly DestructiveCommandPattern[]) {}

  static create(commands: DestructiveCommandPattern[]) {
    const invalid = commands.find((entry) => entry.command.trim() === '');
    if (invalid) {
      return Result.err(
        new FuseHooksEngineDomainError('DESTRUCTIVE_COMMAND_INVALID', 'command must not be empty'),
      );
    }
    return Result.ok(new DestructiveCommandList(commands.map((entry) => ({ ...entry }))));
  }

  isDestructive(commandLine: string): boolean {
    return this.commands.some((entry) =>
      commandLine.includes(entry.command)
      && entry.dangerousOptions.some((option) => commandLine.includes(option)));
  }

  equals(other: DestructiveCommandList): boolean {
    return JSON.stringify(this.commands) === JSON.stringify(other.commands);
  }
}
