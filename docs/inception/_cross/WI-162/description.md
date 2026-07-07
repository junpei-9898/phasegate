---
id: WI-162
type: issue
severity: high
status: tested
affects: [documentation]
source: internal
---

# WI-162: L4 Status Drift And Semantic Payload Schema Reconciliation

> 起票日: 2026-05-12
> 起票経緯: `phasegate:status --json`, `phasegate:detect-drift --json`, semantic drift, consistency findings の payload schema を product construction 正本へ落とし込むため。

## スコープ

- `HarnessStatusSummary.hookHealth`
- `HarnessStatusSummary.baselineHealth`
- `operationalWarnings`
- drift `location`, precision source, unit resolution warning
- consistency `expected` / `actual` / next action
- semantic drift `DesignIntent` / `ImplementationBehavior` / `TestObservation`
- `unitName + behaviorId` key

## 主要成果物

- `docs/product/construction/harness-api/domain_model.md`
- `docs/product/construction/harness-api/logical_design.md`
- `docs/product/construction/harness-api/it_test_design.md`
- `docs/product/construction/validator-system/*`
- `docs/guide/cli-reference.md`
- `docs/guide/layer-model.md`

## 受け入れ基準

- [x] JSON schema / handler flow / IT design が hook/baseline/status/drift payload を固定する。
- [x] L4-001 structural drift と WI-139 semantic drift の責務境界が説明される。
- [x] fail-on-warning の前提条件が payload の存在と結びつく。

## 依存

`WI-151` と並行可能。

## 対応結果

- `docs/guide/cli-reference.md` に `hookHealth`, `baselineHealth`, `operationalWarnings`, drift category/severity/nextAction, semantic drift key を追加した。
- `harness-api` product domain/logical/IT design に status handler flow と drift summary flow を反映した。
- L4 warning を blocking にする前提が payload の `severity` / `nextAction` / category availability と結びつくように整理した。
