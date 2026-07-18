/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-118
 *
 * ConsistencyReport 値オブジェクト
 * 設計文書間のレイヤー整合性検証結果VO（L4-002専用）
 */
import type { HarnessErrorLike } from "./validation-result.js";

export interface MismatchPair {
  readonly expected: string;
  readonly actual: string;
  readonly location: string;
  readonly nextAction?: string;
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

  // ADR-017 / WI-094: error catalog の defaultSeverity: warning と整合
  toHarnessErrors(): readonly HarnessErrorLike[] {
    return this.mismatchPairs.map((pair) => ({
      code: { value: "L4-002", toString: () => "L4-002" },
      severity: { value: "warning", toString: () => "warning" },
      message: `レイヤー整合性違反: expected "${pair.expected}" but got "${pair.actual}" at ${pair.location}`,
      suggestion: pair.nextAction ?? "設計文書間のレイヤー依存方向を統一してください",
      // WI-335: 文書間整合の回復は「どちらの記述が正か」の判断を伴う（ai-assisted）。
      remediationType: "ai-assisted" as const,
    }));
  }
}
