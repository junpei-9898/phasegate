/**
 * @layer domain
 * @unit harness-error
 * @work-item-id WI-335
 *
 * RemediationType — suggested action（suggestion）の修復方式分類
 *
 * phasegate の中核価値は「エラー + 次の 1 手」でエージェントの自己修正を駆動することにある。
 * この分類は「案内された 1 手が本当に従えば直るか」を機械保証するための宣言であり、
 * mechanical と宣言されたエラーは往復テスト
 * （scripts/harness/__tests__/integration/validator-system/remediation-round-trip.test.ts）
 * で「エラー → suggestion を機械適用 → 再実行 → pass」が CI 保証される。
 *
 * - mechanical:  suggestion の操作を解釈なしで機械適用でき、適用すれば必ず解消する
 *                （例: L2-002 の「// @unit を先頭コメントに追加」、
 *                      L3-003 の「layers.L3.coverageThreshold を 0 に設定して opt-out」）
 * - ai-assisted: 修復に AI/人間の判断・設計理解が必要（例: L4 系の design drift 解消）
 * - manual:      人間の判断が必須（例: L3-001 秘密情報の無効化・ローテーション）。
 *                未分類のエラーも安全側でこの扱いとする（default）
 */
export type RemediationType = "mechanical" | "ai-assisted" | "manual";

/** 未分類エラーの既定値。機械適用可能と過剰宣言しない安全側の値。 */
export const DEFAULT_REMEDIATION_TYPE: RemediationType = "manual";

const VALID_REMEDIATION_TYPES: readonly RemediationType[] = Object.freeze(["mechanical", "ai-assisted", "manual"]);

export function isRemediationType(value: unknown): value is RemediationType {
  return typeof value === "string" && (VALID_REMEDIATION_TYPES as readonly string[]).includes(value);
}
