// @unit attestation
// @layer application

/**
 * verify usecase 入力 DTO（logical_design §4.1）。
 */
export interface VerifyAttestationInput {
  /** 検証対象の attestation ファイルパス。 */
  readonly filePath: string;
  /** 各チェック結果を機械可読に出力するか。 */
  readonly emitJson: boolean;
}
