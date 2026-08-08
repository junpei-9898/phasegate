---
id: WI-163
type: issue
severity: high
status: reflected
affects: []
source: internal
---

# WI-163: CI Template And L4 Rollout Product Construction Reconciliation

> 起票日: 2026-05-12
> 起票経緯: WI-124 / WI-128 の live validator registry, preset-aware CI generation, scheduled L4 rollout を product construction に統合するため。

## スコープ

- `ci:generate-template`
- live validator registry
- preset-specific validator selection
- `ci:generate-template --type consistency-check`
- scheduled L4 cron / default-off / advisory policy
- `p2:*` compatibility commands

## 主要成果物

- `docs/product/construction/ci-governance/*`
- `docs/product/construction/setup/*`
- `docs/product/construction/integrations/*`
- `docs/product/construction/config-foundation/*`

## 受け入れ基準

- [x] `listAll` / stub validator list 前提の古い Port / UT / IT / coverage が現行 registry contract と矛盾しない。
- [x] setup / integrations docs が generated CI の配線面を説明する。
- [x] scheduled L4 audit が live L4 surface / advisory policy / failOnWarning と一致することが test design で固定される。

## 依存

`WI-159`。

## 対応結果

- `ci-governance` product logical design に live validator registry, template type, scheduled L4 rollout, `p2:*` compatibility 方針を反映した。
- `setup` / `integrations` / `config-foundation` product docs に generated CI workflow 配線と registry/config 境界を反映した。
- scheduled L4 は standard では advisory/default-off、strict または `failOnWarning` で blocking 化する方針に揃えた。
