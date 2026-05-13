---
id: WI-160
type: story
severity: high
status: tested
affects: [documentation, validator-system, traceability-model]
source: internal
---

# WI-160: Contract Traceability Coverage Guide And Product Expansion

> 起票日: 2026-05-12
> 起票経緯: WI-132..WI-138 の G4 contract traceability を、product construction と public guide の両方で利用可能な仕様として展開するため。

## スコープ

- `L2-015 contract-traceability-coverage`
- `@phasegate-contract`
- `@phasegate-observation`
- `PublicContract`
- `BoundaryCase`
- `ErrorContract`
- `StateMachineModel`
- `TraceabilityGraphSlice`

## 主要成果物

- `docs/product/construction/documentation/domain_model.md`
- `docs/product/construction/documentation/logical_design.md`
- `docs/product/construction/validator-system/*`
- `docs/product/construction/traceability-model/*`
- `docs/guide/layer-model.md`
- `README.md`
- 必要なら新規 `docs/guide/contract-traceability.md`

## 受け入れ基準

- [x] annotation の書き方、behavior key / boundary key / observation key の意味、error/state/traceability findings の読み方が公開 docs から辿れる。
- [x] product construction の `documentation` Unit が annotation 名だけでなく semantic model を持つ。
- [x] `WI-133` の severity policy config 化を、実装済みなのか follow-up なのか明確化する。

## 依存

`WI-159` の validator catalog 決定。

## 対応結果

- `docs/guide/contract-traceability.md` を追加し、`@phasegate-contract` / `@phasegate-observation`、behavior / boundary / observation keys、finding fields を公開 guide 化した。
- `README.md` の guide 一覧から contract traceability guide へ導線を追加した。
- `documentation`, `traceability-model`, `validator-system`, `harness-api` product docs に `PublicContract`, `BoundaryCase`, `ErrorContract`, `StateMachineModel`, `TraceabilityGraphSlice` の責務境界を反映した。
- WI-133 severity policy は validator policy behavior として実装済みで、追加の public config schema field は follow-up であることを明記した。
