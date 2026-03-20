/**
 * @layer application
 * @unit ci-governance
 *
 * CheckEscalationUseCase - H13-02
 */

import type { ErrorRepetitionRepositoryPort } from '../../domain/ports/error-repetition-repository-port.js';
import type { CheckEscalationInput } from '../dto/check-escalation-input.js';
import type { CheckEscalationOutput } from '../dto/check-escalation-output.js';

export class CheckEscalationUseCase {
  constructor(private readonly errorRepetitionRepository: ErrorRepetitionRepositoryPort) {}

  async execute(input: CheckEscalationInput): Promise<CheckEscalationOutput> {
    const { errorCode } = input;

    const errorRepetition = await this.errorRepetitionRepository.findByCode(errorCode);

    if (errorRepetition === null) {
      return {
        exists: false,
        currentCount: null,
        escalated: null,
      };
    }

    return {
      exists: true,
      currentCount: errorRepetition.occurrenceCount,
      escalated: errorRepetition.isEscalated(),
    };
  }
}
