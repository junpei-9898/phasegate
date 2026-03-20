/**
 * @layer presentation
 * @unit ci-governance
 */

import type { RecordErrorOccurrenceOutput } from '../../application/dto/record-error-occurrence-output.js';

export class ErrorRepetitionFormatter {
  formatHuman(output: RecordErrorOccurrenceOutput): string {
    const lines: string[] = [];

    lines.push(`Error occurrence recorded (count: ${output.currentCount})`);
    if (output.escalated) {
      lines.push('⚠️  ESCALATED: Error has occurred too many times');
      if (output.escalationAction) {
        lines.push(`  [${output.escalationAction.logLevel.toUpperCase()}] ${output.escalationAction.messageTemplate}`);
      }
    }

    return lines.join('\n');
  }

  formatJson(output: RecordErrorOccurrenceOutput): string {
    return JSON.stringify(output, null, 2);
  }
}
