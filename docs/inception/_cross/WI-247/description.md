---
id: WI-247
type: issue
severity: high
status: reflected
affects: [ci-governance]
---

# WI-247: validate-pointers の空リスト adapter wiring により全ポインタが dead 判定になるバグ修正

> 起票日: 2026-07-08
> 経緯: `docs/product/construction/ci-governance/logical_design.md` の「(blocked) ci-governance pointer-existence wiring bug」（WI-222 反映時に文書化）。`buildCiGovernance()` が `new HarnessApiCommandExistenceAdapter()` / `new AdrFoundationExistenceAdapter()` を**空リストのデフォルト**で構築するため、`PointerValidator` は全コマンドポインタ・全 ADR リンクを dead と判定する。到達経路: `ci:migrate-agents-md` / `ci:auto-refresh-agent-context`。validator は常時死んでおり防御になっていない。

## 修正方針（承認済み）

1. **ADR 側**: `AdrFoundationExistenceAdapter` を adr-foundation の実 corpus（`docs/ADR/**`）参照に変更。`createAdrFoundationModule(rootDir).adrRepository` に委譲（先行事例: `validator-system/infrastructure/adapters/adr-foundation-reference-adapter.ts` の dynamic import パターン）。`ADR-013` ⇄ `013` の正規化は `AdrId.create`（`^(?:ADR-)?\d{3}$` 受理）で吸収し、不正 ID・例外は false に正規化。
2. **コマンド側**: 既知コマンドリストを **ci-governance infrastructure 層のローカル定数**として定義（main.ts の公開 CLI dispatch から抽出した実サーフェス）。harness-api への新 export は本 WI ではやらない（別 WI）。
3. **composition-root**: `baseDir` を ADR adapter に配線。
4. **実 artifact テスト必須**: 実在 ADR → exists / 偽 ADR-999 → dead / 実在コマンド `phasegate:status` → exists / 偽コマンド → dead / migrate-agents-md 回帰（有効ポインタ入り AGENTS.md fixture が誤検出なく成功）。mock で exists=true を偽装するテストは禁止。

## Acceptance Criteria

- AC-1: 実在する ADR ID（`ADR-013` / `013` の両形式）に対し `AdrExistencePort.exists` が true を返す
- AC-2: 存在しない ADR（`ADR-999`）・不正形式に対し false を返す（例外を投げない）
- AC-3: 実在する CLI コマンド（例: `phasegate:status`）に対し `CommandExistencePort.exists` が true、偽コマンドに false を返す
- AC-4: 有効なポインタのみを含む AGENTS.md に対する migrate/validate フローが dead-pointer 誤検出なしで成功する
