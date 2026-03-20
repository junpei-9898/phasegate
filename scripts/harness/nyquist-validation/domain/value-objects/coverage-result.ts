/**
 * @layer domain
 * @unit nyquist-validation
 *
 * AC網羅率算出結果を表す値オブジェクト
 */

export interface CoverageResultProps {
  readonly rate: number;
  readonly coveredAcCount: number;
  readonly totalAcCount: number;
  readonly uncoveredAcIds: readonly string[];
}

export class CoverageResult {
  readonly rate: number;
  readonly coveredAcCount: number;
  readonly totalAcCount: number;
  readonly uncoveredAcIds: readonly string[];

  private constructor(props: CoverageResultProps) {
    this.rate = props.rate;
    this.coveredAcCount = props.coveredAcCount;
    this.totalAcCount = props.totalAcCount;
    this.uncoveredAcIds = Object.freeze([...props.uncoveredAcIds]);
    Object.freeze(this);
  }

  static create(props: CoverageResultProps): CoverageResult {
    if (props.rate < 0 || props.rate > 1) {
      throw new Error(`rateは0.0〜1.0の範囲内で指定してください: ${props.rate}`);
    }
    if (props.coveredAcCount > props.totalAcCount) {
      throw new Error(
        `coveredAcCount（${props.coveredAcCount}）はtotalAcCount（${props.totalAcCount}）を超えることはできません`
      );
    }
    return new CoverageResult(props);
  }

  meetsThreshold(threshold: number): boolean {
    return this.rate >= threshold;
  }

  equals(other: CoverageResult): boolean {
    return (
      this.rate === other.rate &&
      this.coveredAcCount === other.coveredAcCount &&
      this.totalAcCount === other.totalAcCount &&
      this.uncoveredAcIds.length === other.uncoveredAcIds.length &&
      this.uncoveredAcIds.every((id, i) => id === other.uncoveredAcIds[i])
    );
  }

  toPercentage(): number {
    return Math.floor(this.rate * 10000) / 100;
  }
}
