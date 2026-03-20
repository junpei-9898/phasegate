/**
 * @layer domain
 * @unit ci-governance
 *
 * PointerValidatorドメインサービス
 */

import type { CommandExistencePort } from '../ports/command-existence-port.js';
import type { FileExistencePort } from '../ports/file-existence-port.js';
import type { AdrExistencePort } from '../ports/adr-existence-port.js';
import type { PointerEntry } from '../value-objects/pointer-entry.js';

export class PointerValidator {
  constructor(
    private readonly commandExistencePort: CommandExistencePort,
    private readonly fileExistencePort: FileExistencePort,
    private readonly adrExistencePort: AdrExistencePort,
  ) {}

  async validate(entries: PointerEntry[]): Promise<Array<{ code: string; message: string }>> {
    if (entries.length === 0) return [];

    const errors: Array<{ code: string; message: string }> = [];

    for (const entry of entries) {
      if (entry.isCommand()) {
        const command = entry.command;
        if (command) {
          const exists = await this.commandExistencePort.exists(command);
          if (!exists) {
            errors.push({
              code: 'AGENTS_MD_DEAD_POINTER',
              message: `Dead Pointer: command '${command}' does not exist`,
            });
          }
        }
      } else if (entry.isFile()) {
        const filePath = entry.filePath;
        if (filePath) {
          const exists = await this.fileExistencePort.exists(filePath);
          if (!exists) {
            errors.push({
              code: 'AGENTS_MD_DEAD_POINTER',
              message: `Dead Pointer: file '${filePath}' does not exist`,
            });
          }
        }
      }
    }

    return errors;
  }

  async validateAdrLinks(adrIds: string[]): Promise<Array<{ code: string; message: string }>> {
    if (adrIds.length === 0) return [];

    const errors: Array<{ code: string; message: string }> = [];

    for (const adrId of adrIds) {
      const exists = await this.adrExistencePort.exists(adrId);
      if (!exists) {
        errors.push({
          code: 'AGENTS_MD_DEAD_POINTER',
          message: `Dead Pointer: ADR '${adrId}' does not exist`,
        });
      }
    }

    return errors;
  }
}
