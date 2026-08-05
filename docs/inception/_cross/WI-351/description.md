---
id: WI-351
type: fix
severity: medium
status: drafted
affects: [harness-api, quick-mode]
source: GitHub issue #41 調査中に発見（CLI と hook で分類基準ディレクトリがずれる）
---

# WI-351: check-change-category CLI の configPath / rootDir をプロジェクトルートへ整合させる

<!-- @work-item-id WI-351 -->

## 背景

`phasegate check-change-category` は `createQuickModeCompositionRoot()` を引数なしで生成していた。
このため `HarnessConfigQuickModeConfigAdapter` は `process.cwd()/phasegate.config.json`、
`FsFileExistenceAdapter` は `process.cwd()` を基準にしてしまう。

サブディレクトリから CLI を実行すると config を見失って fatal 終了し、
仮に config が見つかっても相対パスの存在判定（CREATE / MODIFY 推定）が
プロジェクトルート基準の hook とずれ、同じパスでも分類結果が食い違う。

## 修正

config-foundation が上方探索で解決した `sourcePath` から configPath / rootDir を導出して
composition root へ注入する（`.phasegate-local/` 配下の config はその親をルートとする）。
hook 側で WI-346 が行った整合と同型。config 未検出・不正時は従来どおり cwd 基準へフォールバックする。
