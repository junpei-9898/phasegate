/**
 * @layer domain
 * @unit phase2-extensions
 * @work-item-id WI-122
 */
import type { DocFreshnessRule } from '../aggregates/doc-freshness-rule.js';
import type { DocumentAge, DocumentAgeSource } from '../value-objects/document-age.js';

export interface FreshnessCheckResult {
  ruleId: string;
  documentPath: string;
  ageInDays: number;
  ageSource: DocumentAgeSource;
  category: 'stable' | 'stale-after-source-change';
  level: 'ok' | 'warn' | 'error';
  message: string;
  nextAction: string;
}

export class FreshnessCheckService {
  check(rule: DocFreshnessRule, documentAge: DocumentAge, documentPath: string): FreshnessCheckResult {
    if (!rule.isEnabled()) {
      return {
        ruleId: rule.ruleId,
        documentPath,
        ageInDays: documentAge.ageInDays,
        ageSource: documentAge.source,
        category: 'stable',
        level: 'ok',
        message: 'disabled rule skipped',
        nextAction: 'no action required',
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
      category: documentAge.source === 'related-source-change' ? 'stale-after-source-change' : 'stable',
      level,
      message: `${documentPath} is ${documentAge.ageInDays} days old`,
      nextAction: level === 'ok'
        ? 'no action required'
        : documentAge.source === 'related-source-change'
          ? 'Refresh the document against the related WI/product/source change'
          : 'Review whether this stable document should have a wider freshness threshold',
    };
  }
}
