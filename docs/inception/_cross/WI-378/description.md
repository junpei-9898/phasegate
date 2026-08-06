---
id: WI-378
type: chore
severity: trivial
status: drafted
affects: [config-foundation, quick-mode]
source: GitHub issue #44 課題 2（WI-353 契約テストの昇格）/ ADR-040 §4
---

# WI-378: preset quickMode 契約テストを「宣言が実際に読まれる」検証へ昇格する

<!-- @work-item-id WI-378 -->

## 背景

WI-353 の契約テスト（`scripts/harness/__tests__/integration/config-foundation/preset-quick-mode-contract.test.ts`）は
「presets の `allowedCategories` == adapter のハードコード既定値」という**二重管理の整合**を検査していた。
これは経路が繋がっていない状態での次善策であり、宣言がデッドであること自体は検知できない。

WI-377 で adapter が preset 解決を経由するようになったため、検証内容を昇格させる。

## 修正

- `quickMode` を持たない config に対する **adapter の実効値**が、当該防御プリセットの `quickMode` 宣言そのもの
  （`allowedCategories` / `maintainedLayers` / `relaxedGates` の 3 キー全部）と一致することを 3 プリセット分検証する。
  これによりデッド宣言の解消（= 宣言が実際に読まれていること）が回帰テストで固定される。
- 実効既定値が `docs/guide/configuration.md` の記載値と一致することも併せて固定し、
  presets の変更が無告知で実挙動を変えることを検知できるようにする。
- preset ごとに宣言が異なれば実効値も異なるべき、という将来の拡張（防御プリセットごとの Quick Mode 強度差）に対しても
  そのまま成立するテスト形になる。
