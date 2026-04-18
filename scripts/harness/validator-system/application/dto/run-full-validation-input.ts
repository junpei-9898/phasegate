/**
 * @layer application
 * @unit validator-system
 *
 * RunFullValidationInput — H08-06 UseCase入力DTO
 */
export interface RunFullValidationInput {
  readonly targetPaths: readonly string[];
  readonly unitName: string;
  readonly currentPhase: string;
  readonly targetUnits?: readonly string[];
  readonly includeL4?: boolean;
  readonly failOnWarning?: boolean;
  readonly coverageReportPath?: string;
  readonly requirementMatrixPath?: string;
  /**
   * ISSUE-005 P1-4: 実行レイヤー絞り込み。未指定は全レイヤー実行。
   * 指定された場合、`includeL4` より優先される。
   */
  readonly targetLayers?: readonly ('L2' | 'L3' | 'L4')[];
}
