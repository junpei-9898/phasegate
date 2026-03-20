/**
 * @layer application
 * @unit validator-system
 *
 * RunL3ValidatorsInput — H08-02 UseCase入力DTO
 */
export interface RunL3ValidatorsInput {
  readonly validatorIds?: readonly string[];
  readonly targetPaths: readonly string[];
  readonly coverageReportPath?: string;
  readonly requirementMatrixPath?: string;
}
