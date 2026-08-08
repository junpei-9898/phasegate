---
id: WI-249
type: chore
status: drafted
affects: [integrations]
---

# WI-249: integrations の欠落 domain_model を起こしてフェーズゲートブロックを正規解除する

> 起票日: 2026-07-10
> 起票経緯: `integrations` unit の必須設計文書 `docs/product/construction/integrations/domain_model.md` が存在せず、pre-tool-use hook のフェーズゲートが同 unit へのソース書き込みを全ブロックしていた（missing: domain_model.md）。

## 背景

pre-tool-use hook の full-mode ブロック迂回判定 `isFullModeBypassedByDesignDocs`（`scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts`）は、対象 unit の必須設計文書がすべて揃っている場合にのみ full-mode ブロックを bypass する。

必須設計文書は `PhaseGateQueryAdapter.checkDesignDocsExist`（`scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts`）の `REQUIRED_DESIGN_DOCS = ['logical_design.md', 'domain_model.md']` で定義される。

`integrations` unit は `logical_design.md` は存在するが `domain_model.md` が欠落していたため、full-mode を要する変更（feature 分類）が常にブロックされていた。

## 対応

既存コード `scripts/harness/integrations/pre-commit.ts` に**実在する**型・値オブジェクト・統合サービス関数・ポート・不変条件のみを抽出し、`docs/product/construction/ci-governance/domain_model.md` 等の良質例の書式に倣って `docs/product/construction/integrations/domain_model.md` を新規作成した。捏造した集約・不変条件は記載していない。

honesty note: `pre-commit.ts` は `@unit harness-api` アノテーションを持ち、テストも `__tests__/unit/harness-api/` に置かれるため、コード所有権は harness-api に属する。`integrations` は logical_design.md（WI-092 / WI-163）が定義する論理 Unit（統合エントリポイント群）であり、domain_model.md はその論理 Unit の実コード上の実現を記述する。集約は新設していない（統合境界のため）。

## 受け入れ基準

- [x] `docs/product/construction/integrations/domain_model.md` が実コードに存在する概念のみで作成される（捏造なし）。
- [x] pre-tool-use hook が `integrations` unit へのソース書き込みを missing domain_model.md でブロックしなくなる（EXIT 2 → EXIT 0）。
- [x] 記載した各ドメイン概念に実装ファイル・シンボルへの対応が明記される。

## 検証証跡

integrations unit の feature 変更 probe（`scripts/harness/integrations/ci-runner.ts` への Write, `@unit` 未注釈で path-derived unit=integrations）:

- before（domain_model.md 不在）: `Full mode 必須変更が検出されました ... 判定ルール: MIXED_CHANGES` / **EXIT=2**
- after（domain_model.md 作成後）: **EXIT=0**（`isFullModeBypassedByDesignDocs` が true を返し full-mode ブロックを bypass）

`phasegate:check-phase --unit integrations`: before/after ともに `status: pass`（level-1 完了）。
