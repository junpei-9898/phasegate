/**
 * @layer infrastructure
 * @unit harness-error
 */
import { AdrRef } from "../../domain/value-objects/adr-ref.js";
import { ErrorCode } from "../../domain/value-objects/error-code.js";
import { ErrorDefinition } from "../../domain/value-objects/error-definition.js";
import { FixExample } from "../../domain/value-objects/fix-example.js";
import { Severity } from "../../domain/value-objects/severity.js";

function createDefinition(input: {
  code: string;
  title: string;
  category:
    | "phase_gate"
    | "architecture"
    | "dependency"
    | "quality"
    | "security"
    | "performance"
    | "consistency"
    | "metadata";
  ownerValidatorId: string;
  defaultFixExample: string;
  defaultRemediationType?: "mechanical" | "ai-assisted" | "manual";
}): ErrorDefinition {
  return ErrorDefinition.create({
    code: ErrorCode.create(input.code),
    title: input.title,
    category: input.category,
    defaultSeverity: Severity.create("error"),
    adrRefRequired: true,
    defaultAdrRef: AdrRef.create("ADR-003"),
    fixExampleRequired: true,
    defaultFixExample: FixExample.create(input.defaultFixExample),
    ownerValidatorId: input.ownerValidatorId,
    defaultRemediationType: input.defaultRemediationType ?? null,
  });
}

export const L3_ERROR_DEFINITIONS = Object.freeze([
  createDefinition({
    code: "L3-001",
    title: "セキュリティ上の問題が検出された",
    category: "security",
    ownerValidatorId: "security",
    defaultFixExample: "const token = process.env.API_TOKEN ?? '';",
    // WI-335: 秘密情報の無効化・ローテーション・保管方式の選定は人間の判断が必須。
    // 「機械適用すれば直る」とは宣言しない（過剰宣言の禁止）。
    defaultRemediationType: "manual",
  }),
  createDefinition({
    code: "L3-002",
    title: "パフォーマンス上の問題が検出された",
    category: "performance",
    ownerValidatorId: "performance",
    defaultFixExample: "const actual = await Promise.all(tasks.map((task) => task()));",
  }),
  createDefinition({
    code: "L3-003",
    title: "カバレッジ閾値を下回っている",
    category: "quality",
    ownerValidatorId: "coverage",
    defaultFixExample: "const actualCoverage = 0.95;",
    // WI-335: カバレッジゲートは config の layers.L3.coverageThreshold: 0 で機械的に opt-out
    // できる正規経路を持つ（WI-317 / github#37）。remediation-round-trip テストで
    // 「レポート不在エラー → suggestion の opt-out を機械適用 → 再実行 → SKIP（実効 pass）」を CI 保証。
    // ※ 閾値未達そのもの（テスト追加が必要）を emit する側は ai-assisted を明示指定する。
    defaultRemediationType: "mechanical",
  }),
  createDefinition({
    code: "L3-004",
    title: "要件とテストのトレーサビリティが不足している",
    category: "consistency",
    ownerValidatorId: "nyquist",
    defaultFixExample: 'const storyId = "H06-01";',
  }),
]);
