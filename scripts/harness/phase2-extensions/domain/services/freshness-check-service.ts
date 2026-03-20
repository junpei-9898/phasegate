/**
 * @layer domain
 * @unit phase2-extensions
 */
import type { DocFreshnessRule } from '../aggregates/doc-freshness-rule.js';
import type { DocumentAge, DocumentAgeSource } from '../value-objects/document-age.js';

export interface FreshnessCheckResult {
  ruleId: string;
  documentPath: string;
  ageInDays: number;
  ageSource: DocumentAgeSource;
  level: 'ok' | 'warn' | 'error';
  message: string;
}

export class FreshnessCheckService {
  check(rule: DocFreshnessRule, documentAge: DocumentAge, documentPath: string): FreshnessCheckResult {
    if (!rule.isEnabled()) {
      return {
        ruleId: rule.ruleId,
        documentPath,
        ageInDays: documentAge.ageInDays,
        ageSource: documentAge.source,
        level: 'ok',
        message: 'disabled rule skipped',
      };
    }

    const level =
      documentAge.ageInDays >= rule.threshold.errorThresholdDays
        ? 'error'
        : documentAge.ageInDays >= rule.threshold.warnThresholdDays
          ? 'warn'
          : 'ok';

    return {
      ruleId: rule.ruleId,
      documentPath,
      ageInDays: documentAge.ageInDays,
      ageSource: documentAge.source,
      level,
      message: `${documentPath} is ${documentAge.ageInDays} days old`,
    };
  }
}
