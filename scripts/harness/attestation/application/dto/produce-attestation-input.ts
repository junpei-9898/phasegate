// @unit attestation
// @layer application

import type { SignatureMode } from "../../domain/value-objects/signature-block.js";

/**
 * attest usecase 入力 DTO（logical_design §4.1）。
 */
export interface ProduceAttestationInput {
  /** record 出力先パス（既定は presentation で `.harness/attestation.json`）。 */
  readonly out: string;
  /** gateResult != "pass" なら record を一切出力せず exit 1。 */
  readonly requirePass: boolean;
  /** 生成 document を stdout へエコーするか。 */
  readonly emitJson: boolean;
  /** 署名モード。`signed` は not-yet-implemented。 */
  readonly mode: SignatureMode;
}
