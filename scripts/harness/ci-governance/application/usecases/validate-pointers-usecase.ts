/**
 * @layer application
 * @unit ci-governance
 *
 * ValidatePointersUseCase - H13-03
 */

import type { AgentsMdPort } from '../../domain/ports/agents-md-port.js';
import type { PointerValidator } from '../../domain/services/pointer-validator.js';
import type { ValidatePointersOutput } from '../dto/validate-pointers-output.js';

export class ValidatePointersUseCase {
  constructor(
    private readonly agentsMdPort: AgentsMdPort,
    private readonly pointerValidator: PointerValidator,
  ) {}

  async execute(input?: { includeAdrLinks?: boolean }): Promise<ValidatePointersOutput> {
    const includeAdrLinks = input?.includeAdrLinks ?? false;
    const agentsMdPointer = await this.agentsMdPort.read();

    const pointers = [...agentsMdPointer.pointers];
    const structuralErrors = agentsMdPointer.validate();
    const existenceErrors = await this.pointerValidator.validate(pointers);

    let adrErrors: Array<{ code: string; message: string }> = [];
    if (includeAdrLinks) {
      adrErrors = await this.pointerValidator.validateAdrLinks([...agentsMdPointer.adrLinks]);
    }

    const allErrors = [...structuralErrors, ...existenceErrors, ...adrErrors];

    // Collect dead pointer keys from errors
    const deadPointerKeys: string[] = [];
    for (const error of existenceErrors) {
      // Extract key from error message pattern: "Dead Pointer: command|file 'X' does not exist"
      const cmdMatch = error.message.match(/command '([^']+)' does not exist/);
      const fileMatch = error.message.match(/file '([^']+)' does not exist/);
      const target = cmdMatch?.[1] ?? fileMatch?.[1];
      if (target) {
        // Find the key for this target
        for (const pointer of pointers) {
          if (pointer.isCommand() && pointer.command === target) {
            deadPointerKeys.push(pointer.key);
          } else if (pointer.isFile() && pointer.filePath === target) {
            deadPointerKeys.push(pointer.key);
          }
        }
      }
    }

    const passed = allErrors.length === 0;
    return {
      passed,
      valid: passed,
      errors: allErrors,
      checkedCount: pointers.length,
      totalPointers: pointers.length,
      deadPointers: deadPointerKeys,
    };
  }
}
