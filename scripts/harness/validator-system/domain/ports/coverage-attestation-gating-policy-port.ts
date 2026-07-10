// @unit validator-system
// @layer domain
// @work-item-id WI-258

import type { CoverageReportGatingModel } from "../value-objects/coverage-gating-report.js";

/**
 * WI-258 / ADR-030 §Decision.3.② — coverage_report 走査結果の供給ポート。
 * 走査対象（docs/product/construction/*​/coverage_report.md）の解決は infrastructure が担う
 * （cwd 起点・targetPaths 非依存の corpus 走査）。
 */
export interface CoverageAttestationGatingPolicyPort {
  collect(): Promise<readonly CoverageReportGatingModel[]>;
}
