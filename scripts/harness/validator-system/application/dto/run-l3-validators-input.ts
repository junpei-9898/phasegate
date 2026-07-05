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
  /** L3-005（AC-bound coverage）のスコープ対象 story-id 配列。省略時 []。 */
  readonly acBoundStories?: readonly string[];
}
