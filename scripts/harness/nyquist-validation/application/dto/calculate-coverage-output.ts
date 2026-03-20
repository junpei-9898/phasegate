/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-03: CalculateCoverageUseCase 出力DTO
 */

export interface CalculateCoverageOutput {
  readonly coveredAcCount: number;
  readonly totalAcCount: number;
  readonly ratePercent: number;
  readonly uncoveredAcIds: readonly string[];
  readonly threshold: number | null;
  readonly meetsThreshold: boolean | null;
}
