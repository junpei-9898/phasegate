/**
 * @layer domain
 * @unit validator-system
 *
 * PerformanceScannerPort — パフォーマンス問題検出（L3-002）
 */
import type { HarnessErrorLike } from '../value-objects/validation-result.js';

export interface PerformanceScannerPort {
  scan(targetPaths: readonly string[], thresholds: Record<string, number>): Promise<{
    passed: boolean;
    findings: readonly HarnessErrorLike[];
  }>;
}
