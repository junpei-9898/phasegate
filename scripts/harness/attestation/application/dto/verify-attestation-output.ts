// @unit attestation
// @layer application

/**
 * 機械的 5 チェックの個別結果（logical_design §1.4.4 / §4.1）。
 */
export interface VerifyAttestationChecks {
  /** schema/shape 妥当 */
  readonly schema: boolean;
  /** mode サポート対象（signed は非対応） */
  readonly mode: boolean;
  /** canonical payload 上で attestationDigest 再計算 == 格納値 */
  readonly attestationDigest: boolean;
  /** inputs.sources[].digest を現在ファイルから再計算 == 格納値 */
  readonly inputHashes: boolean;
  /** granularity を validatorSet から再導出 == 格納値（anti-laundering） */
  readonly granularity: boolean;
}

/**
 * verify usecase 出力 DTO（logical_design §4.1）。
 */
export interface VerifyAttestationOutput {
  /** 全チェック合格か。 */
  readonly ok: boolean;
  /** 各機械的チェックの合否。 */
  readonly checks: VerifyAttestationChecks;
  /** mismatch / エラーの説明群。 */
  readonly mismatches: string[];
}
