---
id: WI-159
type: issue
severity: high
status: drafted
affects: [validator-system, quick-mode, documentation]
source: internal
---

# WI-159: Validator Catalog And Execution Contract Reconciliation

> 起票日: 2026-05-12
> 起票経緯: WI-117..139 後の validator catalog / execution contract を product docs と public guide に統一するため。

## スコープ

- `L2-013 cli-e2e-test-existence`
- `L2-014 work-item-status-staleness`
- `L2-015 contract-traceability-coverage`
- `L4-004 doc-freshness`
- `L4-005 pointer-validation`
- skip / advisory / fail-on-warning の扱い
- Quick Mode の `maintainedLayers` / maintained validators / skipped validators contract
- `L2` layer shorthand と `L2-015` の Quick Mode 維持対象判断

## 主要成果物

- `docs/product/construction/validator-system/domain_model.md`
- `docs/product/construction/validator-system/logical_design.md`
- `docs/product/construction/validator-system/unit_test_design.md`
- `docs/product/construction/validator-system/it_test_design.md`
- `docs/product/construction/validator-system/coverage_report.md`
- `docs/guide/layer-model.md`

## 受け入れ基準

- [ ] `ValidatorId` の有効範囲、L2/L3/L4 default execution、`validate --layer all` の skip 仕様が同じ表現で揃う。
- [ ] `L4-004` / `L4-005` を invalid とする古い coverage / test description が残らない。
- [ ] Quick Mode が layer shorthand を展開するのか validator id の完全一致だけを扱うのかが、実装・product docs・guide で一致する。
- [ ] public guide にも `L2-013`, `L2-014`, `L2-015`, `L4-004`, `L4-005` が載る。

## 依存

`WI-151` と強く関連。公開 guide 側は `WI-151`、product 正本側は本 WI に分ける。
