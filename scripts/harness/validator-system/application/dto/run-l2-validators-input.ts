/**
 * @layer application
 * @unit validator-system
 *
 * RunL2ValidatorsInput — H08-01 UseCase入力DTO
 */
export interface RunL2ValidatorsInput {
  readonly validatorIds?: readonly string[];
  readonly targetPaths: readonly string[];
  readonly unitName: string;
  readonly currentPhase: string;
}
