# シナリオテスト設計: H03-04 WorkItem frontmatter parser 追加

@story-id H03-04
設計要素: pure function 単体拡張のため、シナリオ E2E テストは対象外。代替として手動検証シナリオ S-1〜S-4 を定義しユニットテスト（UT-TM-W01〜W10）に落とし込む。

- **対応ストーリー**: H03-04
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. シナリオテスト対象

本ストーリーは pure function（副作用なし・I/O なし）の追加であり、UI や外部接続を含まない。E2E / IT テストは不要。

## 2. 代替: 手動検証シナリオ（実装後 spot-check）

### S-1: frontmatter 不在の既存文書への影響なし

1. frontmatter を持たない既存 `logical_design.md` に対し `parseWorkItemFrontmatter()` を適用
2. `null` が返り、例外が発生しない

### S-2: 最小 WI frontmatter の成功ケース

1. 新規 `description.md` に以下を記述:
   ```
   ---
   id: WI-001
   type: story
   ---
   # Title
   ```
2. `parseWorkItemFrontmatter()` が `{ id: 'WI-001', type: 'story' }` を返す

### S-3: legacy ID の受容

1. `id: H02-04` / `id: ISSUE-026` / `id: HF2-01` を含む frontmatter
2. すべて validation pass し、正しい string が返る

### S-4: enum 違反の failure ケース

1. `type: unknown` を含む frontmatter
2. `WorkItemFrontmatterValidationError` が throw される

## 3. 正式な検証

これらのシナリオは全てユニットテスト（`work-item-frontmatter-parser.test.ts`）に AC として落とし込み、回帰網に組み込む。手動検証は実装完了後の spot-check に留める。
