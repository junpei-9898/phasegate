// @unit validator-system
// @layer application

export interface RunFullValidationInput {
  readonly targetPaths: readonly string[];
  readonly unitName: string;
  readonly currentPhase: string;
  readonly targetUnits?: readonly string[];
  readonly includeL4?: boolean;
  readonly failOnWarning?: boolean;
  readonly coverageReportPath?: string;
  readonly requirementMatrixPath?: string;
  /** 指定時は includeL4 より優先。未指定は全レイヤー実行。 */
  readonly targetLayers?: readonly ('L2' | 'L3' | 'L4')[];
}
