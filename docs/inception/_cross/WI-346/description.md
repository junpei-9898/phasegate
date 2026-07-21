---
id: WI-346
type: fix
severity: high
status: drafted
affects: [agent-integration]
source: bug sweep v0.292.0 (2026-07-21) 既知残課題③
---

# WI-346: hook 内 quick-mode composition root が process.cwd() の config を読む不整合の修正

<!-- @work-item-id WI-346 -->

## 背景

pre-tool-use-hook.ts の `QuickModeFullModeRequirementAdapter` が `createQuickModeCompositionRoot()` を無引数で生成するため、内部の HarnessConfigQuickModeConfigAdapter / FsFileExistenceAdapter が process.cwd() 基準の config を読む。hook 本体は `findConfigPath(input.cwd)` で解決した configPath / projectRoot を使っており、cwd 不一致時に quick-mode 分類だけ別の config(または既定値)で判定される。`.phasegate-local` オーバーライドも無視される(誤通過を実測済み)。

## 修正

composition root 生成に hook が解決済みの configPath / projectRoot を引き渡し、他アダプタと config 解決を統一する。
