/**
 * @layer application
 * @unit ci-governance
 *
 * ResetRepetitionUseCase - H13-02
 */

import type { ErrorRepetitionRepositoryPort } from '../../domain/ports/error-repetition-repository-port.js';
import type { ResetRepetitionInput } from '../dto/reset-repetition-input.js';
import type { ResetRepetitionOutput } from '../dto/reset-repetition-output.js';

export class ResetRepetitionUseCase {
  constructor(private readonly errorRepetitionRepository: ErrorRepetitionRepositoryPort) {}

  async execute(input: ResetRepetitionInput): Promise<ResetRepetitionOutput> {
    const { errorCode, confirmedResolution } = input;

    const errorRepetition = await this.errorRepetitionRepository.findByCode(errorCode);

    if (errorRepetition === null) {
      return {
        success: false,
        errors: [{
          code: 'REPETITION_NOT_FOUND',
          message: `ErrorRepetition not found for errorCode: ${errorCode}`,
        }],
      };
    }

    if (!confirmedResolution) {
      return {
        success: false,
        errors: [{
          code: 'REPETITION_RESET_FORBIDDEN',
          message: 'INV-7: confirmedResolution must be true to reset repetition',
        }],
      };
    }

    if (!errorRepetition.isEscalated()) {
      return {
        success: false,
        errors: [{
          code: 'REPETITION_RESET_FORBIDDEN',
          message: 'INV-7: reset() can only be called when escalated=true',
        }],
      };
    }

    try {
      const reset = errorRepetition.reset();
      await this.errorRepetitionRepository.save(reset);
      return { success: true, errors: [] };
    } catch (err) {
      return {
        success: false,
        errors: [{
          code: 'REPETITION_RESET_FORBIDDEN',
          message: err instanceof Error ? err.message : String(err),
        }],
      };
    }
  }
}
