/**
 * @layer application
 * @unit validator-system
 *
 * RunL1ValidatorsInput DTO — H08-07/H08-08: L1バリデータ実行入力
 */
export interface RunL1ValidatorsInput {
  readonly targetPaths?: readonly string[];
  readonly validatorIds?: readonly string[];
}

// @story-id H08-07