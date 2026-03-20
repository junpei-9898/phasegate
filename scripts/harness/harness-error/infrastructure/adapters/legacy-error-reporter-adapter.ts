/**
 * @layer infrastructure
 * @unit harness-error
 */
import type { HarnessError } from '../../../core/error-reporter.js';
import type { ValidatorIssueDraft } from '../../application/dto/validator-issue-draft.js';

function compressSuggestion(error: HarnessError): string {
  const parts: string[] = [];

  if (error.resolution.fixSuggestion.trim().length > 0) {
    parts.push(error.resolution.fixSuggestion.trim());
  }

  if (error.resolution.docLinks.length > 0) {
    parts.push(`参考資料: ${error.resolution.docLinks.join(', ')}`);
  }

  if (error.resolution.relatedFiles.length > 0) {
    parts.push(`関連ファイル: ${error.resolution.relatedFiles.join(', ')}`);
  }

  if (parts.length === 0 && error.message.agentInstruction.trim().length > 0) {
    parts.push(error.message.agentInstruction.trim());
  }

  if (parts.length === 0 && error.message.detailed.trim().length > 0) {
    parts.push(error.message.detailed.trim());
  }

  if (parts.length === 0) {
    parts.push(error.message.short);
  }

  return parts.join('\n');
}

function mapSeverity(
  severity: HarnessError['severity']
): 'error' | 'warning' {
  return severity === 'error' ? 'error' : 'warning';
}

export class LegacyErrorReporterAdapter {
  toDraft(error: HarnessError): Readonly<ValidatorIssueDraft> {
    return Object.freeze({
      code: error.code,
      message: error.message.short,
      suggestion: compressSuggestion(error),
      severity: mapSeverity(error.severity),
      validatorId: error.metadata.validator,
    });
  }
}
