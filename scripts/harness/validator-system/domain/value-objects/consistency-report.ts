/**
 * @layer domain
 * @unit validator-system
 *
 * ConsistencyReport 値オブジェクト
 * 設計文書間のレイヤー整合性検証結果VO（L4-002専用）
 */
import type { HarnessErrorLike } from './validation-result.js';

export interface MismatchPair {
  readonly expected: string;
  readonly actual: string;
  readonly location: string;
}

export interface ConsistencyReportProps {
  readonly mismatchPairs: readonly MismatchPair[];
  readonly checkTargets: readonly string[];
  readonly checkedAt?: string;
}

export class ConsistencyReport {
  readonly mismatchPairs: readonly MismatchPair[];
  readonly checkTargets: readonly string[];
  readonly checkedAt: string;

  private constructor(props: ConsistencyReportProps) {
    this.mismatchPairs = Object.freeze([...props.mismatchPairs]);
    this.checkTargets = Object.freeze([...props.checkTargets]);
    this.checkedAt = props.checkedAt ?? new Date().toISOString();
    Object.freeze(this);
  }

  static create(props: ConsistencyReportProps): ConsistencyReport {
    return new ConsistencyReport(props);
  }

  hasMismatches(): boolean {
    return this.mismatchPairs.length > 0;
  }

  mismatchCount(): number {
    return this.mismatchPairs.length;
  }

  toHarnessErrors(): readonly HarnessErrorLike[] {
    return this.mismatchPairs.map((pair) => ({
      code: { value: 'L4-002', toString: () => 'L4-002' },
      severity: { value: 'error', toString: () => 'error' },
      message: `レイヤー整合性違反: expected "${pair.expected}" but got "${pair.actual}" at ${pair.location}`,
      suggestion: '設計文書間のレイヤー依存方向を統一してください',
    }));
  }
}
