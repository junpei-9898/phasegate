/**
 * @layer application
 * @unit validator-system
 *
 * RunL4ValidatorsInput — H08-03 UseCase入力DTO
 */
export interface RunL4ValidatorsInput {
  readonly validatorIds?: readonly string[];
  readonly targetUnits?: readonly string[];
  readonly strictMode?: boolean;
}
