/**
 * @layer infrastructure
 * @unit validator-system
 *
 * AstPerformanceScannerAdapter — PerformanceScannerPort実装
 */
import type { PerformanceScannerPort } from '../../domain/ports/performance-scanner-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';

export class AstPerformanceScannerAdapter implements PerformanceScannerPort {
  async scan(targetPaths: readonly string[], thresholds: Record<string, number>): Promise<{
    passed: boolean;
    findings: readonly HarnessErrorLike[];
  }> {
    const findings: HarnessErrorLike[] = [];
    // stub実装: 実際の実装ではAST解析でループ内awaitやN+1パターンを検出する
    return { passed: findings.length === 0, findings };
  }
}
