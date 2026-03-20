/**
 * @layer domain
 * @unit phase2-extensions
 */
import type { DocFreshnessRule } from '../aggregates/doc-freshness-rule.js';
import type { PointerRule } from '../aggregates/pointer-rule.js';

export interface FreshnessConfigPort {
  loadRules(): Promise<DocFreshnessRule[]>;
  loadPointerRules(): Promise<PointerRule[]>;
}
