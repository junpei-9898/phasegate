// @unit ci-governance
// @layer domain

/**
 * verify で検出した整合性差分の種別。
 * - mismatch: digest 不一致
 * - added: 実在するが manifest に無い
 * - missing: manifest にあるが実在しない
 * - manifest-absent: manifest ファイル自体が欠落
 */
export type IntegrityDriftKind = "mismatch" | "added" | "missing" | "manifest-absent";

export interface IntegrityDrift {
  readonly path: string;
  readonly kind: IntegrityDriftKind;
}
