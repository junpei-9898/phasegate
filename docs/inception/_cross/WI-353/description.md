---
id: WI-353
type: fix
severity: medium
status: drafted
affects: [config-foundation, quick-mode]
source: GitHub issue #27（防御プリセットの宣言値と Quick Mode の実効値が乖離している）
---

# WI-353: 防御プリセットの quickMode.allowedCategories を実効既定値に揃える

<!-- @work-item-id WI-353 -->

## 背景

`minimal` / `standard` / `strict` の 3 防御プリセットはいずれも
`quickMode.allowedCategories: ["bugfix"]` を宣言していた。

一方 Quick Mode の実効経路である `HarnessConfigQuickModeConfigAdapter` は
preset 解決を経由せず raw JSON を読み、既定 `["bugfix","docs","test","config"]` で判定する。
つまり presets の `quickMode` はどこからも参照されない死んだ宣言であり、
宣言値と実効値が乖離したまま
「防御プリセットを strict にしたから bugfix しか通らない」という誤った読み取りを誘発していた。

## 修正

3 プリセットの `allowedCategories` を実効既定値の 4 カテゴリに揃える。
逆方向（実効値を `["bugfix"]` へ縮める）は既存利用者への破壊的変更になるため採らない。
`docs/guide/configuration.md` も既定 4 カテゴリと記載しており正。

preset 定義と adapter の実効既定値の一致を固定する契約テストを追加する。
