---
id: WI-109
type: issue
severity: high
status: implemented
affects: [biome-ast-engine, config-foundation, harness-api, ci-governance]
source: internal
---

# WI-109: PhaseGate self-lint architecture violation must be resolved

> 起票日: 2026-05-09
> 起票経緯: WI-106 PhaseGate dogfood audit で、PhaseGate 自身の `phasegate:lint --json` と `phasegate:complete-check --json` が `no-layer-violation` により失敗することを確認した。

## 背景

dogfood 実行では以下の violation により self-lint が失敗している。

- `scripts/harness/integrations/pre-commit.ts`
- `scripts/harness/config-foundation/infrastructure/repositories/file-system-config-repository.ts`

PhaseGate が自分自身の repository baseline で `complete-check` に失敗すると、後続 WI の検証結果が常にノイズを含む。これは新機能ではなく、既存 architecture rule と実装の不一致である。

## 本 WI でやること

1. `pre-commit.ts` が config-foundation infrastructure に直接依存している理由を確認する。
2. 依存方向を保つため、harness-api / config-foundation の既存 port / application 経路へ移す。
3. 例外登録で逃がす場合は、なぜ architecture violation ではないかを ADR または product docs に明記する。
4. `phasegate:lint --json` と `phasegate:complete-check --json` が PhaseGate repository で clean に戻ることを確認する。

## 受け入れ基準

- [x] `phasegate:lint --json` が該当 `no-layer-violation` なしで PASS する
- [x] `phasegate:complete-check --json` が同じ architecture violation で失敗しない
- [x] 修正方針が `docs/product/construction/*/logical_design.md` に `@work-item-id WI-109` 付きで反映されている
- [x] regression test が同種の integration-to-infrastructure 直参照を検出できる

## 関連

- [WI-106 dogfood audit](../WI-106/phasegate_dogfood_audit.md)
