// @unit validator-system
// @layer domain
// @work-item-id WI-258

/**
 * WI-258 / ADR-030 §Decision.3.② — coverage-attestation-gating (L2-016) の判定ドメインサービス。
 *
 * INV-A: hasLegacyMarker のファイルは error を生成せず legacyCount に計上し warning を 1 件生成（見える負債）。
 * INV-B: マーカー無しファイルで attestation 参照を持たない ✅ claim は error violation（fail-closed）。
 * INV-C: ✅ を持たないファイルは violation も warning も生成しない（対象外）。
 */

import {
  type CoverageGatingFinding,
  CoverageGatingReport,
  type CoverageReportGatingModel,
} from "../value-objects/coverage-gating-report.js";

export class CoverageAttestationGatingService {
  check(models: readonly CoverageReportGatingModel[]): CoverageGatingReport {
    const violations: CoverageGatingFinding[] = [];
    const warnings: CoverageGatingFinding[] = [];
    let legacyCount = 0;

    for (const model of models) {
      if (model.hasLegacyMarker) {
        // INV-A: 免除だが可視化。claim の有無に関わらず legacy として計上する
        // （マーカーは「このファイルはまだゲートされていない負債」の宣言であるため）。
        legacyCount += 1;
        warnings.push({
          severity: "warning",
          sourcePath: model.path,
          message: `ungated-legacy coverage_report (attestation ゲート未適用の負債): ${model.path}`,
          suggestion:
            "各 ✅ 主張に <!-- @attestation <id> --> を付与し、@coverage-gating: ungated-legacy マーカーを除去して段階返済すること。",
        });
        continue;
      }

      // INV-B / INV-C: マーカー無しファイルの各 ✅ claim を検査する。
      for (const claim of model.claims) {
        if (!claim.hasAttestationRef) {
          violations.push({
            severity: "error",
            sourcePath: model.path,
            message: `${model.path}:${claim.lineNumber} の ✅ 主張に attestation 参照がありません（bare ✅ は fail-closed）。`,
            suggestion:
              "✅ 主張に <!-- @attestation <id> --> を付与するか、未返済なら <!-- @coverage-gating: ungated-legacy --> マーカーで免除（負債可視化）すること。",
          });
        }
      }
    }

    return CoverageGatingReport.create(violations, warnings, legacyCount);
  }
}
