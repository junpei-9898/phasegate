// @unit attestation
// @layer application

/**
 * MatrixSourcePort（H16-03 / WI-227）
 *
 * acBoundScope 導出用の requirement-test-matrix を供給する application ポート。
 * 読み込み/parse に失敗した場合は throw する（呼び出し側 usecase が fail-closed に変換する）。
 */
export interface MatrixSourcePort {
  /**
   * @param matrixFilePath matrix のパス（省略時は adapter の既定パス）
   * @returns parse 済みの matrix plain object
   */
  load(matrixFilePath?: string): Promise<unknown>;
}
