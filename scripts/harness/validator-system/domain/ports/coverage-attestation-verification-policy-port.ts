// @unit validator-system
// @layer domain
// @work-item-id WI-268

import type {
  AttestationReference,
  AttestationScopeEvidence,
} from "../value-objects/attestation-verification-report.js";

/**
 * WI-268 / ADR-030 §Decision.1・§Decision.3.②（第2段） — L3-007 の走査・解決結果供給ポート。
 *
 * 参照走査（ungated-legacy 免除込み）と matrix 由来の解決可能スコープ解決は infrastructure が担う
 * （cwd 起点・targetPaths 非依存の corpus 走査）。
 */
export interface CoverageAttestationVerificationCollectResult {
  /** ungated-legacy を除いた coverage_report から抽出した attestation 参照。 */
  readonly references: readonly AttestationReference[];
  /** matrix 由来の解決可能スコープ。references が空のときは空集合でよい（matrix 未読）。 */
  readonly evidence: AttestationScopeEvidence;
  /**
   * 参照ありで matrix を読めなかった fail-closed シグナル。
   * null なら matrix 読み込みは問題なし（または参照 0 件で matrix 未読）。
   */
  readonly matrixError: string | null;
}

export interface CoverageAttestationVerificationPolicyPort {
  collect(): Promise<CoverageAttestationVerificationCollectResult>;
}
