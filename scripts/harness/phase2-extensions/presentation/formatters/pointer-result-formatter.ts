/**
 * @layer presentation
 * @unit phase2-extensions
 * @work-item-id WI-122
 */
import type { ValidateDocPointersOutput } from '../../application/dto/validate-doc-pointers-output.js';

export class PointerResultFormatter {
  formatJson(result: ValidateDocPointersOutput): string {
    return JSON.stringify(result, null, 2);
  }

  formatText(result: ValidateDocPointersOutput): string {
    return [
      `documents=${result.summary.totalDocuments} pointers=${result.summary.totalPointers} broken=${result.summary.brokenPointers}`,
      ...result.results.map((entry) =>
        `${entry.isResolvable ? 'ok' : entry.severity}: ${entry.semanticPointerType} ${entry.pointerTarget} owner=${entry.owner} next=${entry.nextAction}`
      ),
    ].join('\n');
  }
}
