// @unit agent-integration
// @layer domain

import type { PhaseGateQueryResult } from "../value-objects/phase-gate-query-result.js";
import type { WriteTargetScope } from "../value-objects/write-target-scope.js";

export interface PhaseGateQueryPort {
  checkGate(scope: WriteTargetScope, targetFilePath?: string): Promise<PhaseGateQueryResult>;

  /**
   * 指定Unitの必須設計文書（logical_design.md / domain_model.md）が揃っているかを確認する。
   * full mode 判定の bypass 条件として用いる（ISSUE-021）。
   */
  checkDesignDocsExist?(unitId: string): Promise<boolean>;
}
