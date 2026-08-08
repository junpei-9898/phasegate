---
id: WI-339
type: fix
severity: normal
status: implemented
affects: [harness-api]
source: bug sweep v0.292.0 (2026-07-21) Bug#4
---

# WI-339: phasegate:status の L2/L3 誤 fail 報告修正(実効 severity の未適用経路)

<!-- @work-item-id WI-339 -->

## 背景

`phasegate:status` が L2/L3 を fail と報告する一方、`validate` / `ci-check` / `complete-check` は pass する。command-dispatch-service.ts の `summarizeLayerResults` が raw `passed` のみを見ており、WI-332 で effective-severity-policy.ts に一本化された実効 severity 判定(warning 降格)を無視する未カバー経路だった。L2-016 の passed 表現が経路間で分裂する。

## 修正

status 経路の validator 結果写像に他 3 経路と同じ `isEffectivelyPassed` を適用し、WI-332 の経路間一致 regression テストに status を第 4 経路として追加。実効 fail は fail のまま(ゲート弱体化なし)をテストで pin。
