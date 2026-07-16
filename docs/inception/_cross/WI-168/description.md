---
id: WI-168
type: issue
severity: high
status: tested
affects: [documentation]
source: internal
---

# WI-168: Product Unit / Integration Contract / ADR Registry Reconciliation

> 起票日: 2026-05-12
> 起票経緯: product construction 本体を直しても上位 contract が旧仕様を再導入しないよう、上位 product contract と ADR registry を同期するため。

## スコープ

- `docs/product/units/integration_contract.md`
- `docs/product/units/validator-system_unit.md`
- `docs/product/environment_contract.md`
- `docs/ADR/*`
- validator ID registry / archgate / 旧 CLI / 旧 Unit 数の記述

## 受け入れ基準

- [x] 上位 product contract が `L2-001..L4-003` だけを正とする古い validator catalog を残さない。
- [x] ADR と product unit docs が、現行 CLI / validator / installation lifecycle と矛盾しない。
- [x] `WI-159` の Unit 内正本化と責務が分離され、再発防止の参照先が明確になる。

## 依存

`WI-159` と並行可能。ただし validator catalog 名称は `WI-159` に合わせる。

## 対応結果

- integration contract / environment contract / validator-system Unit doc を現行 L2/L3/L4 catalog に同期した。
- ADR-002 / ADR-004 / ADR-013 に現行 Work Item / validator catalog 方針を追記した。
- 上位 docs は validator-system registry と public layer guide を参照し、古い `L2-001..L4-003` 限定 catalog を再導入しない方針にした。
