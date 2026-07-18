/**
 * @layer infrastructure
 * @unit harness-error
 * @work-item-id WI-156
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
    defaultSeverity: Severity.create("warning"),
    adrRefRequired: true,
    defaultAdrRef: AdrRef.create("ADR-004"),
    fixExampleRequired: true,
    defaultFixExample: FixExample.create(input.defaultFixExample),
    ownerValidatorId: input.ownerValidatorId,
    defaultRemediationType: input.defaultRemediationType ?? null,
  });
}

export const L4_ERROR_DEFINITIONS = Object.freeze([
  createDefinition({
    code: "L4-001",
    title: "設計と実装の乖離が検出された",
    category: "consistency",
    ownerValidatorId: "drift-detect",
    defaultFixExample: 'const actual = "align implementation with design";',
    // WI-335: design drift の解消は設計意図の理解が必要で機械適用不能だが、
    // AI エージェントが設計文書を読んで自己修正できる（ai-assisted）。
    defaultRemediationType: "ai-assisted",
  }),
  createDefinition({
    code: "L4-002",
    title: "文書間の整合性が崩れている",
    category: "consistency",
    ownerValidatorId: "consistency-check",
    defaultFixExample: 'const actual = "synchronize documentation";',
    // WI-335: 文書間整合の回復は「どちらの記述が正か」の判断を伴う（ai-assisted）。
    defaultRemediationType: "ai-assisted",
  }),
  createDefinition({
    code: "L4-003",
    title: "未使用コードが検出された",
    category: "consistency",
    ownerValidatorId: "dead-code",
    defaultFixExample: 'const actual = "remove unused export";',
  }),
  createDefinition({
    code: "L4-004",
    title: "設計ドキュメントの鮮度が閾値を超過した",
    category: "consistency",
    ownerValidatorId: "doc-freshness",
    defaultFixExample: 'const actual = "review or refresh stale design document";',
  }),
  createDefinition({
    code: "L4-005",
    title: "設計ドキュメント内のポインタ参照が解決できない",
    category: "consistency",
    ownerValidatorId: "pointer-validation",
    defaultFixExample: 'const actual = "fix unresolved document pointer";',
  }),
  createDefinition({
    code: "L4-006",
    title: "スキルカタログ数とドキュメント宣言が一致しない",
    category: "consistency",
    ownerValidatorId: "skill-catalog-drift",
    defaultFixExample: 'const actual = "update skill count declarations with the skill catalog";',
  }),
]);
