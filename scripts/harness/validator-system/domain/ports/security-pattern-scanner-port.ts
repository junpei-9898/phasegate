/**
 * @layer domain
 * @unit validator-system
 *
 * SecurityPatternScannerPort — セキュリティパターン検出（L3-001）
 */
import type { HarnessErrorLike } from '../value-objects/validation-result.js';

export interface SecurityPatternScannerPort {
  scan(targetPaths: readonly string[]): Promise<{
    passed: boolean;
    findings: readonly HarnessErrorLike[];
  }>;
}
