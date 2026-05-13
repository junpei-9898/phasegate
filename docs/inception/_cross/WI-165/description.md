---
id: WI-165
type: issue
severity: normal
status: tested
affects: [config-foundation, biome-ast-engine, traceability-model, phase-dependency-model, installation, harness-api, nyquist-validation, documentation]
source: internal
---

# WI-165: Product Coverage And Test Design Refresh

> 起票日: 2026-05-12
> 起票経緯: WI-117..148 以降の product construction reflection が coverage report / IT design / test logic まで追随しているかを更新するため。

## スコープ

- `docs/product/construction/config-foundation/coverage_report.md`
- `docs/product/construction/biome-ast-engine/coverage_report.md`
- `docs/product/construction/traceability-model/coverage_report.md`
- `docs/product/construction/phase-dependency-model/coverage_report.md`
- `docs/product/construction/installation/*_test_design.md`
- `docs/product/construction/harness-api/*_test_design.md`
- `docs/product/construction/nyquist-validation/it_test_design.md`
- `docs/product/construction/documentation/coverage_report.md` の要否

## 受け入れ基準

- [x] coverage report が旧 Hxx / K3.5 だけでなく WI-117..148 の横断 reflection を評価する。
- [x] Nyquist matrix generation / intent coverage の CLI / end-to-end flow が IT design に載る。
- [x] installation lifecycle の install / doctor / uninstall / reconcile に残る stub / future / TODO 前提が、実装済みなのか follow-up か判別できる。
- [x] WI status `tested` と未チェック AC が読者に矛盾しない扱いになる。

## 依存

`WI-159..164`, `WI-168..169` の後に実施する。

## 対応結果

- config-foundation / biome-ast-engine / traceability-model / phase-dependency-model / installation / nyquist-validation / documentation の coverage/test design を更新した。
- Nyquist の matrix generation / intent coverage E2E flow を IT design に追加した。
- installation lifecycle の実装済みコマンドと extension point の区別を coverage / IT design に明記した。
