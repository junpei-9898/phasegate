// @unit validator-system
// @layer domain
// @work-item-id WI-332

/**
 * effective-severity-policy — 実効 severity 判定の単一ソース (ADR-017 / ADR-021)。
 *
 * validator 1件が「実質 pass」かを severity-aware に判定するルール。
 * WI-332 以前は同じ判定式が 3 箇所（validate 集約 usecase / harness-api CiCheckResult /
 * pre-commit の手動集約）に複製・乖離しており、#38（complete-check だけ warning-only で
 * exit 1）型の回帰を招いた。以後、実効判定は必ずこの関数を経由すること。
 *
 * 判定ルール（ADR-017 Decision の集計セマンティクスそのもの）:
 * - skipped: 実質 pass
 * - passed=true: 実質 pass
 * - passed=false かつ error severity（!= warning）を含む: fail
 * - passed=false かつ errors=[]（severity 判定不能）: 安全側に倒して fail
 * - passed=false かつ warning のみ: failOnWarning=false（既定）で実質 pass、true で fail
 */

/**
 * 判定に必要な最小構造。validator-system の ValidationResultContract と
 * harness-api の ValidatorCheckItem の双方が構造的に満たす。
 */
export interface EffectiveSeverityCheckItem {
  readonly passed: boolean;
  readonly skipped?: boolean;
  readonly errors?: readonly { readonly severity: string }[];
}

export function isEffectivelyPassed(item: EffectiveSeverityCheckItem, failOnWarning = false): boolean {
  if (item.skipped || item.passed) return true;
  const errors = item.errors ?? [];
  const hasNonWarningError = errors.some((e) => e.severity !== "warning");
  const hasWarnings = errors.some((e) => e.severity === "warning");
  const isEmptyFail = errors.length === 0;
  const hasFail = isEmptyFail || hasNonWarningError || (failOnWarning && hasWarnings);
  return !hasFail;
}
