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
}
