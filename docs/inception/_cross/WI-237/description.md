---
id: WI-237
type: chore
severity: normal
status: drafted
affects: [docs]
---

# WI-237: ci-governance 反ロンダリング深掘り（pointer-existence 配線バグの確認と coverage 訂正）

> 起票日: 2026-07-07
> 経緯: skill-quality（WI-236）に続く、系統的な coverage-laundering 返済の第 2 単位深掘り。ci-governance の実装は完全（スタブ無し）だが、(1) 存在性テストがモックのみで実コーパス未検証、(2) composition-root の存在性アダプタが空リストで配線される本番バグ、が判明した。反ロンダリング原則を厳守する。

## 確認した事実（実アーティファクト照合）

1. **本番配線バグ（REAL PRODUCTION BUG・確認済み）**: `scripts/harness/ci-governance/composition-root.ts` L86-87 が `new HarnessApiCommandExistenceAdapter()` / `new AdrFoundationExistenceAdapter()` を**空リストで**生成。両アダプタは既定引数 `[]` のため、本番では全 ADR/コマンドポインタが dead pointer と誤判定され `validate-pointers` / `ci:migrate-agents-md` の存在性検証が無効化される。ポート・アダプタ・ドメインは実装済みで、注入データのみの配線欠陥。自リポ `AGENTS.md` に pointer 節が無いため影響は潜在的。
2. **H13-03-AC-2 / AC-4 / INV-10 のモック誤引用（CONFIRMED-FALSE）**: `UT-PV-005/006` は `AdrExistencePort` をモック化、`validate-pointers-usecase.test.ts` は存在性 port を `vi.fn()` 化。実 `docs/ADR/`（canonical 29 件）・実コマンドレジストリに対する検証は皆無。ドメインロジックは検証されるが AC 本文の「実在性検証」は未達。
3. **H13-01-AC-1/AC-3 は実テストが既存だが未引用**: `render-ci-template-usecase.test.ts` の `WI031-001/002/003`, `WI182-001`, `WI183-001`, `WI032-001` が `new YamlTemplateRendererAdapter(process.cwd())` を構築し実 `docs/templates/` とバイト一致検証（10/10 green）。coverage_report は弱いモック版 `IT-UC-RenderCiTemplate-001/002` を引用していた。

## 実施内容（本 WI で landed）

1. `docs/product/construction/ci-governance/logical_design.md` に **WI-222 の正直な反映**を追記（`ValidatorIdRegistryAdapter` が L4-007 advisory を preset 導出リストから除外する不変条件）。WI-222 は `validator-id-registry-adapter.ts` が担う genuine な ci-governance 変更であり、ミスアノテーションではない（他 unit の over-broad affects ではなく、当該アダプタ自身が `@work-item-id WI-222` と実ロジックを持つ）。反映は un-gated docs 編集で、ci-governance の WI-222 分の reflection ブロックを解消した。
2. `docs/product/construction/ci-governance/coverage_report.md`:
   - H13-01-AC-1/AC-2/AC-3 の引用を実ファイル検証テスト（WI031/WI182/WI183/WI032 系）へ再バインド。
   - H13-03-AC-2/AC-4/INV-10 を ⚠️（ドメインロジックのみ・実コーパス/本番配線未検証）へ訂正し、サマリを 13/13→11/13(85%)・12/12→11/12(92%) へ正直に再計算。
   - §11 訂正履歴に本番配線バグ・モック誤引用・H13-01 再バインドを日付付きで記録。
3. 本 tracking doc の作成。

## スコープ外（BLOCKED / 据え置き）

- **本番配線バグの source 修正**: `scripts/harness/ci-governance/composition-root.ts` の編集は `[L2-STORY-REFLECTION]` フェーズゲートにより**ブロック**。WI-222 分は解消したが、ci-governance に約 23 件の未反映 WI 背景バックログ（WI-040, WI-107/108/109, WI-120/122/123/124/128, WI-140/141/142/150/174/182/183/185/189/190/194/198）が残り、全ソース編集を阻む。Bash 迂回は品質防御の無効化に当たるため実施せず（CLAUDE.md 禁止事項）。反映バックログ返済 or cascade-updater による正規解消を要する別 WI として据え置く。
- 上記が未解消のため、H13-03 存在性 AC を実コーパス test に **バインドしない**（本番が壊れたままの green test は laundering に当たるため）。
- harness-api への `KNOWN_COMMANDS` export 追加も harness-api 側の同フェーズゲート（多数の未反映 WI）でブロックされたため未実施。API 契約変更・ドメインモデル追加・`phasegate.config.json` / acBoundStories 変更は一切行わない。

## 検証

- `npx vitest run .../render-ci-template-usecase.test.ts` → 10/10 green（H13-01 再バインド先の実在確認）。
- `npm run test` green（baseline 4127・source/test コード非変更）。
- `tsc --noEmit` clean。
- 反ロンダリング: 実在・真正カバーの行のみ ✅ を維持し、モックのみの H13-03 行は ⚠️ へ正直に降格。本番配線バグは隠さず §11 に露出。

## 主要な honesty finding（要報告）

ci-governance 単位は自身のソースが約 23 件の未反映 WI reflection バックログの背後で実質凍結されており、確認済みの本番バグを正規手順で修正できない。これは foundation-repayment（自リポの正直な gating）の次段として、reflection バックログ返済が必要であることを示す。
