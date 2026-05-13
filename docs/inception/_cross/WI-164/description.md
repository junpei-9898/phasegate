---
id: WI-164
type: issue
severity: high
status: drafted
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

- [ ] 旧 `file-path | url`, `allowedPointerTypes`, `failOnBroken` の説明と WI-122 の新 semantics が矛盾しない。
- [ ] L4-004 / L4-005 report が owner / pointer type / source / severity / next action を持つことが設計される。

## 依存

`WI-159`。
