/**
 * @layer domain
 * @unit nyquist-validation
 *
 * 閾値設定取得ポート
 */

export interface CoverageThreshold {
  readonly standard: number;
  readonly strict: number;
  readonly active: number;
}

export interface CoverageThresholdPort {
  getThreshold(): Promise<CoverageThreshold>;
}
