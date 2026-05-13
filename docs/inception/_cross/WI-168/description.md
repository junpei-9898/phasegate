---
id: WI-168
type: issue
severity: high
status: drafted
affects: [documentation, validator-system, integrations]
source: internal
---

# WI-168: Product Unit / Integration Contract / ADR Registry Reconciliation

> 起票日: 2026-05-12
> 起票経緯: product construction 本体を直しても上位 contract が旧仕様を再導入しないよう、上位 product contract と ADR registry を同期するため。

## スコープ

- `docs/product/units/integration_contract.md`
- `docs/product/units/validator_system_unit.md`
- `docs/product/environment_contract.md`
- `docs/ADR/*`
- validator ID registry / archgate / 旧 CLI / 旧 Unit 数の記述

## 受け入れ基準

- [ ] 上位 product contract が `L2-001..L4-003` だけを正とする古い validator catalog を残さない。
- [ ] ADR と product unit docs が、現行 CLI / validator / installation lifecycle と矛盾しない。
- [ ] `WI-159` の Unit 内正本化と責務が分離され、再発防止の参照先が明確になる。

## 依存

`WI-159` と並行可能。ただし validator catalog 名称は `WI-159` に合わせる。
