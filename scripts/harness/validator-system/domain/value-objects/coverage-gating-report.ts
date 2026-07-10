// @unit validator-system
// @layer domain
// @work-item-id WI-258

/**
 * WI-258 / ADR-030 §Decision.3.② — coverage_report の attestation ゲート（L2-016）用ドメインモデル。
 *
 * coverage_report.md の ✅ 主張に attestation 参照（`<!-- @attestation <id> -->`）を要求する
 * anti-laundering の value-object 群。L2 は参照の存在・形状のみを検証し（bare ✅ を fail-closed で遮断）、
 * attestation レコードとの authoritative 突合は L3 が担う（ADR-030）。
 */

/** 1 件の ✅ 主張（AC が「達成」と主張する行）。 */
export interface CoverageClaim {
  /** ✅ を含む行番号（1 起点）。 */
  readonly lineNumber: number;
  /** 同一行 or 直前の連続コメント行に `@attestation` 参照があるか。 */
  readonly hasAttestationRef: boolean;
}

/** 1 coverage_report ファイルの走査結果。 */
export interface CoverageReportGatingModel {
  readonly path: string;
  /** `<!-- @coverage-gating: ungated-legacy -->` マーカー（ファイル全体免除）の有無。 */
  readonly hasLegacyMarker: boolean;
  readonly claims: readonly CoverageClaim[];
}

/** ゲート判定の 1 finding。 */
export interface CoverageGatingFinding {
  readonly severity: "error" | "warning";
  readonly sourcePath: string;
  readonly message: string;
  readonly suggestion: string;
}

/**
 * ゲート判定レポート。violations は fail-closed の error、warnings は legacy 可視化。
 */
export class CoverageGatingReport {
  readonly violations: readonly CoverageGatingFinding[];
  readonly warnings: readonly CoverageGatingFinding[];
  readonly legacyCount: number;

  private constructor(
    violations: readonly CoverageGatingFinding[],
    warnings: readonly CoverageGatingFinding[],
    legacyCount: number,
  ) {
    this.violations = Object.freeze([...violations]);
    this.warnings = Object.freeze([...warnings]);
    this.legacyCount = legacyCount;
    Object.freeze(this);
  }

  static create(
    violations: readonly CoverageGatingFinding[],
    warnings: readonly CoverageGatingFinding[],
    legacyCount: number,
  ): CoverageGatingReport {
    return new CoverageGatingReport(violations, warnings, legacyCount);
  }

  hasViolations(): boolean {
    return this.violations.length > 0;
  }
}
