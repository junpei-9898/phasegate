// @unit validator-system
// @layer domain
// @work-item-id WI-259

/**
 * WI-259 / ADR-030 §Decision.3.④ — advisory インジェクションスキャナ（L3-006）用ドメインモデル。
 *
 * 指示搭載ファイルに対する既知インジェクションパターンの検出結果を表す value-object 群。
 * 全 finding は severity='warning'（advisory）。error / violation は構造上生成しない（§4.(b)）。
 */

/** 検出種別。 */
export type InjectionFindingKind =
  | "instruction-override"
  | "invisible-unicode"
  | "base64-blob"
  | "html-comment-instruction";

/** 1 走査対象ファイル（infra が解決）。 */
export interface InjectionScanTarget {
  /** project-relative パス（報告用）。 */
  readonly path: string;
  readonly content: string;
}

/** 1 件の検出。severity は常に 'warning'。 */
export interface InjectionFinding {
  readonly kind: InjectionFindingKind;
  readonly severity: "warning";
  readonly sourcePath: string;
  /** 1 起点の行番号。 */
  readonly lineNumber: number;
  readonly message: string;
  readonly suggestion: string;
}

/**
 * スキャン判定レポート。findings はすべて warning（advisory）。
 */
export class InjectionScanReport {
  readonly findings: readonly InjectionFinding[];

  private constructor(findings: readonly InjectionFinding[]) {
    this.findings = Object.freeze([...findings]);
    Object.freeze(this);
  }

  static create(findings: readonly InjectionFinding[]): InjectionScanReport {
    return new InjectionScanReport(findings);
  }

  hasFindings(): boolean {
    return this.findings.length > 0;
  }
}
