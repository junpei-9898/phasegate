# 論理設計: H10-06 — WI-aware quick-implementor trivial path

@story-id H10-06
設計要素: Quick Mode が WI taxonomy を判断する契約。

## 1. 対象

対象は `quick-implementor` スキル定義である。既存Quick Mode判定エンジンはファイルカテゴリを判定するが、WI frontmatterの運用ルールはスキルの入口契約として明文化する。

## 2. 判定ルール

作業対象WIが明示されている場合、`description.md` frontmatter の `type` を確認する。

| type | quick-implementor |
|---|---|
| `fix` | 適用候補 |
| `chore` | 適用候補 |
| `story` | story-implementorへエスカレーション |
| `issue` | story-implementorへエスカレーション |
| `refactor` | story-implementorへエスカレーション |

`fix | chore` であっても、API契約変更・新ドメインモデル・レイヤー構造変更を伴う場合は既存ルール通りFull Modeへ上げる。

## 3. 証跡

Quick Modeで実装する場合も、コミットメッセージに `Work-Item: WI-XXX` trailer を含める。これはPhase D-2のCI検証と接続する。
