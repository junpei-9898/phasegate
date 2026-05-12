/**
 * @layer infrastructure
 * @unit phase2-extensions
 * @work-item-id WI-122
 */
import type { HarnessConfigV2 } from '../../../config-foundation/domain/harness-config.js';
import { DocFreshnessRule } from '../../domain/aggregates/doc-freshness-rule.js';
import { PointerRule } from '../../domain/aggregates/pointer-rule.js';
import type { FreshnessConfigPort } from '../../domain/ports/freshness-config-port.js';
import { FreshnessThreshold } from '../../domain/value-objects/freshness-threshold.js';

type Phase2RuleConfig = {
  paths?: {
    designDocs?: string;
    inceptionDocs?: string;
  };
  phase2Extensions?: {
    freshnessRules?: Array<{
      ruleId: string;
      documentPattern: string;
      warnThresholdDays: number;
      errorThresholdDays: number;
      enabled?: boolean;
    }>;
    pointerRules?: Array<{
      ruleId: string;
      documentPattern: string;
      failOnBroken?: boolean;
      owner?: string;
      pointerPolicies?: Record<string, 'fail' | 'warn' | 'skip'>;
    }>;
  };
};

function normalizePathPatternRoot(value: string | undefined): string {
  const normalized = value?.replace(/\\/g, '/').replace(/\/+$/g, '');
  return normalized && normalized.length > 0 ? normalized : 'docs/product/construction';
}

export class HarnessConfigFreshnessAdapter implements FreshnessConfigPort {
  constructor(private readonly config?: HarnessConfigV2 | Phase2RuleConfig) {}

  async loadRules(): Promise<DocFreshnessRule[]> {
    const configRules = this.config && 'phase2Extensions' in this.config ? this.config.phase2Extensions?.freshnessRules : undefined;
    if (!configRules || configRules.length === 0) {
      const designDocsRoot = normalizePathPatternRoot(this.config?.paths?.designDocs);
      return [
        DocFreshnessRule.create({
          ruleId: 'default-doc-freshness',
          documentPattern: `${designDocsRoot}/**/*.md`,
          threshold: FreshnessThreshold.create({ warnThresholdDays: 30, errorThresholdDays: 90 }),
          enabled: true,
        }),
      ];
    }

    return configRules.map((rule) =>
      DocFreshnessRule.create({
        ruleId: rule.ruleId,
        documentPattern: rule.documentPattern,
        threshold: FreshnessThreshold.create({
          warnThresholdDays: rule.warnThresholdDays,
          errorThresholdDays: rule.errorThresholdDays,
        }),
        enabled: rule.enabled ?? true,
      }),
    );
  }

  async loadPointerRules(): Promise<PointerRule[]> {
    const configRules = this.config && 'phase2Extensions' in this.config ? this.config.phase2Extensions?.pointerRules : undefined;
    if (!configRules || configRules.length === 0) {
      const designDocsRoot = normalizePathPatternRoot(this.config?.paths?.designDocs);
      return [
        PointerRule.create({
          ruleId: 'default-pointer-rule',
          documentPattern: `${designDocsRoot}/**/*.md`,
          failOnBroken: true,
          owner: 'documentation',
          pointerPolicies: {
            'product-doc': 'fail',
            adr: 'fail',
            implementation: 'warn',
            reference: 'warn',
            'external-url': 'skip',
          },
        }),
      ];
    }

    return configRules.map((rule) =>
      PointerRule.create({
        ruleId: rule.ruleId,
        documentPattern: rule.documentPattern,
        failOnBroken: rule.failOnBroken ?? true,
        owner: rule.owner,
        pointerPolicies: rule.pointerPolicies,
      }),
    );
  }
}
