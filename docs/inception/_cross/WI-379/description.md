---
id: WI-379
type: fix
severity: normal
status: drafted
affects: [quick-mode]
source: issue #44 統合時の検証（WI-377 が追加した IT のテスト名重複で World WCR-005 が 12 件発生）
---

# WI-379: WI-377 の IT のテスト名重複を解消し World 構造違反を解消する

<!-- @work-item-id WI-379 -->

## 背景

WI-377 で追加した
`scripts/harness/__tests__/integration/quick-mode/quick-mode-config-preset-resolution.integration.test.ts`
に、同一ファイル内で解決不能な `it` 名の重複があった。

- `it.each(PRESET_IDS)("防御プリセット '%s' で …")` が 3 箇所（先頭リテラルが
  プレースホルダ手前まで同一のため test-reference node id が `防御プリセット ` に潰れる）
- `it("実効既定値で動作すること")` が 2 箇所

test-reference node id は `story:AC:file:it:<path>:name:value:<名前>` で構成されるため、
同名テストは候補が 2〜3 件に膨らみ WCR-005（node id の一意解決）に違反する。
`world:derive` は new-structural 12 件を報告し、
`self-repo-world-adoption.it.test.ts` / `session-start-world-obligations.integration.test.ts`
の 3 テストが赤になっていた（baseline 579 に対し structural 591）。

ブランチ側で検知されなかったのは、当該 worktree では husky hook が未導入で
pre-commit の L2 検査と world 系 IT が一度も走っていなかったため。

## 修正

各 `it` 名の先頭リテラルを文脈（`quickMode 未宣言` / `空オブジェクト` / `部分宣言` /
`全キー宣言` / `未知の防御プリセット` / `project セクション欠落`）で一意化する。
アサーションは変更していない（20 ケースの期待値は WI-377 のまま）。

## 検証

- `world:derive`: structural 591 → 579（= adopted-legacy baseline、new-structural 0）
- 上記 3 テストを含む関連 6 ファイルが緑

## スコープ外

`@story` アノテーションの妥当性そのもの（当該ファイルは同ディレクトリの慣行に従い
`H10-02` を付与）は本 WI では見直さない。
