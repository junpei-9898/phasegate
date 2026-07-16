// @unit validator-system
// @layer domain
// @work-item-id WI-268

/**
 * WI-268 / ADR-030 §Decision.1・§Decision.3.②（第2段） — coverage_report の attestation
 * 参照を requirement-test-matrix に対して authoritative に突合する L3-007 用ドメインモデル。
 *
 * L2-016（bare ✅ の遮断＝参照の形状のみ）の authoritative 相棒。参照 id が本ランのテスト
 * corpus から再生成された matrix 上に実在し、テスト参照を持つことを機械検証する。解決不能な
 * 参照（空手形の attestation）は fail-closed の error として遮断する。
 */

/** coverage_report 内の 1 件の `<!-- @attestation <id> -->` 参照。 */
export interface AttestationReference {
  /** 参照 id（story-id 形式を期待。例 `H05-02`）。 */
  readonly id: string;
  /** 参照を含む coverage_report の project-relative パス。 */
  readonly sourcePath: string;
  /** 参照行（1 起点）。 */
  readonly lineNumber: number;
}

/**
 * matrix 由来の「解決可能なスコープ」集合。
 * resolvableScopeIds = matrix 上に存在し、かつ testReferences を 1 件以上持つ story-id 集合。
 */
export interface AttestationScopeEvidence {
  readonly resolvableScopeIds: ReadonlySet<string>;
}

/** 1 件の突合違反（解決不能な参照）。severity は常に 'error'（fail-closed / blocking tier）。 */
export interface AttestationVerificationFinding {
  readonly severity: "error";
  readonly sourcePath: string;
  readonly lineNumber: number;
  readonly message: string;
  readonly suggestion: string;
}

/**
 * 突合判定レポート。findings はすべて error（fail-closed）。
 */
export class AttestationVerificationReport {
  readonly findings: readonly AttestationVerificationFinding[];

  private constructor(findings: readonly AttestationVerificationFinding[]) {
    this.findings = Object.freeze([...findings]);
    Object.freeze(this);
  }

  static create(findings: readonly AttestationVerificationFinding[]): AttestationVerificationReport {
    return new AttestationVerificationReport(findings);
  }

  hasFindings(): boolean {
    return this.findings.length > 0;
  }
}
