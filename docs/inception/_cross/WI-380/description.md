---
id: WI-380
type: fix
severity: medium
status: drafted
affects: [config-foundation]
source: WI-371〜374（issue #43）と WI-377（ADR-040）の統合時に露見した未定義動作
---

# WI-380: categoryOverrides × 防御プリセット解決の合流点を確定する

<!-- @work-item-id WI-380 -->

## 背景

issue #43（WI-371〜374）は `quickMode.categoryOverrides` を導入したが、その実装は
`HarnessConfigQuickModeConfigAdapter` が `phasegate.config.json` を raw JSON として
直読みしていた時代の adapter を前提にしていた。並行して main には WI-377（ADR-040）が入り、
同 adapter は防御プリセット解決（`PresetResolutionService.resolve`）経由で
`quickMode` の実効値を決めるようになった。

この 2 つを統合すると、`categoryOverrides` は preset 解決の `deepMerge` を通過する。
その挙動は実装上は定まっていたが、テストにもドキュメントにも書かれておらず、
「preset が `categoryOverrides` を宣言したらどうなるのか」が未定義のままだった。
`categoryOverrides` は「設定したのに効かない」を直すための機能なので、
その実効値の決まり方が未定義であることは元の欠陥の再生産にあたる。

## 確定した挙動

`deepMerge` は preset 側に存在しないキーを source からそのまま引き継ぎ、
両者が持つ object はキー単位で再帰的に merge する。したがって:

| 状況 | 実効値 |
|------|--------|
| preset 未宣言 / source 宣言 | source の宣言がそのまま残る（現行の 3 preset は全てこの経路） |
| preset 宣言 / source 未宣言 | preset の宣言が継承される |
| 双方が同じカテゴリキーを宣言 | そのカテゴリの glob 配列は source が全置換 |
| preset のみが持つカテゴリキー | preset の glob 配列が残る |

すなわち merge 単位は他の quickMode サブフィールドより 1 段深く、
**object 全体ではなくカテゴリキー単位**である。

## 対応

- `preset-resolution-service.test.ts` に UT-CF-178/179/180 を追加し上表を固定
- `docs/guide/configuration.md` の `categoryOverrides` 節に merge 単位を明記
- 統合時に混入したテスト品質の劣化を返済（schema validate error の
  length-only assertion を error contract の観測へ）
