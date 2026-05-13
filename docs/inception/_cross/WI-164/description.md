---
id: WI-164
type: issue
severity: high
status: tested
affects: [phase2-extensions, documentation, validator-system]
source: internal
---

# WI-164: Phase2 Pointer Freshness Contract Cleanup

> 起票日: 2026-05-12
> 起票経緯: WI-122 の doc freshness / pointer validation operational semantics を phase2-extensions の主モデル・DTO・test design に統合するため。

## スコープ

- pointer owner
- semantic pointer type
- pointer type 別 fail / warn / skip
- external URL policy
- stable docs vs stale docs
- source document / next action

## 主要成果物

- `docs/product/construction/phase2-extensions/domain_model.md`
- `docs/product/construction/phase2-extensions/logical_design.md`
- `docs/product/construction/phase2-extensions/unit_test_design.md`
- `docs/product/construction/phase2-extensions/it_test_design.md`
- `docs/guide/layer-model.md`

## 受け入れ基準

- [x] 旧 `file-path | url`, `allowedPointerTypes`, `failOnBroken` の説明と WI-122 の新 semantics が矛盾しない。
- [x] L4-004 / L4-005 report が owner / pointer type / source / severity / next action を持つことが設計される。

## 依存

`WI-159`。

## 対応結果

- `docs/guide/layer-model.md` に L4 pointer/freshness report shape と external URL default skip を追加した。
- `phase2-extensions` product domain/IT/coverage docs に owner, semantic pointer type, source document, severity, next action の contract を反映した。
- `validator-system` product docs に L4-004/L4-005 bridge mapping と compatibility `p2:*` の位置づけを反映した。
