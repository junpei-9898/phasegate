/**
 * @layer application
 * @unit ci-governance
 *
 * RecordErrorOccurrenceUseCase - H13-02
 */

import type { RepetitionDetector } from '../../domain/services/repetition-detector.js';
import type { EscalationExecutorPort } from '../../domain/ports/escalation-executor-port.js';
import type { RecordErrorOccurrenceInput } from '../dto/record-error-occurrence-input.js';
import type { RecordErrorOccurrenceOutput } from '../dto/record-error-occurrence-output.js';

export class RecordErrorOccurrenceUseCase {
  constructor(
    private readonly repetitionDetector: RepetitionDetector,
    private readonly escalationExecutorPort: EscalationExecutorPort,
  ) {}

  async execute(input: RecordErrorOccurrenceInput): Promise<RecordErrorOccurrenceOutput> {
    const { errorCode, errorMessage } = input;

    const result = await this.repetitionDetector.detectWithCount({
      code: errorCode,
      message: errorMessage,
    });

    if (result.escalationAction !== null) {
      await this.escalationExecutorPort.execute(result.escalationAction, {
        errorCode,
        count: result.currentCount,
      });
    }

    return {
      currentCount: result.currentCount,
      escalated: result.escalated,
      escalationAction: result.escalationAction
        ? { logLevel: result.escalationAction.logLevel, messageTemplate: result.escalationAction.messageTemplate }
        : null,
    };
  }
}
