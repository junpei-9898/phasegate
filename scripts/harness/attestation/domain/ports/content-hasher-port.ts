// @unit attestation
// @layer domain

import type { Digest } from "../value-objects/digest.js";

/**
 * canonical payload / source content の sha256 を計算するポート（外部→ドメイン）。
 * 実体（node:crypto）は Infrastructure に隔離する。
 * digest 計算は集約の不変条件 INV-4/INV-5 の一部であるため domain 層に配置する。
 */
export interface ContentHasherPort {
  sha256(content: string): Digest;
}
