/**
 * @layer domain
 * @unit validator-system
 *
 * AcCoveragePolicyPort — nyquist-validation AcCoverageGatePolicy（L3-004）
 */
import type { HarnessErrorLike } from "../value-objects/validation-result.js";

export interface AcCoveragePolicyPort {
  checkCoverage(context: { matrixFilePath?: string }): Promise<{
    passed: boolean;
    errors: readonly HarnessErrorLike[];
    /**
     * WI-324: フレッシュプロジェクト（story 未作成・matrix 未生成）では L3-004 を
     * fail-closed ではなく SKIP として扱う。true の場合、上位（RunL3ValidatorsUseCase）は
     * skipReason 付きの skipWithReason 結果へ変換する。省略時（既存実装・既存モック）は
     * 従来どおり passed/errors のみで判定される（後方互換 optional）。
     */
    skipped?: boolean;
    /** skipped=true のときの人間可読なスキップ理由。 */
    skipReason?: string;
  }>;
}
