# ドメインモデル: H03-04 WorkItem frontmatter parser 追加

@story-id H03-04
設計要素: `WorkItemFrontmatter` 値オブジェクト (readonly fields) + 3 つの string literal union type + 専用 validation error の追加。

- **対応ストーリー**: H03-04
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. 追加する値オブジェクト

### `WorkItemFrontmatter`

設計文書 frontmatter から抽出した WI メタデータのスナップショット。immutable な readonly interface。

| フィールド | 型 | 必須 | 制約 |
|----------|----|------|------|
| `id` | `string` | ✅ | `WI-\d+` / `H\d{2}-\d{2}` / `HF\d+-\d{2}` / `ISSUE-\d+` のいずれか |
| `type` | `WorkItemType` | ✅ | `story / issue / fix / refactor / chore` |
| `affects` | `readonly string[]` | — | 影響 Unit 名の配列（cross-unit WI のみ設定） |
| `severity` | `WorkItemSeverity` | — | `trivial / normal / high` |
| `status` | `WorkItemStatus` | — | `drafted / reflected / implemented / tested` |
| `source` | `string` | — | 外部報告源（例: `github#123`）自由文字列 |
| `legacyId` | `string` | — | 移行用エイリアス（例: `ISSUE-026`）自由文字列 |

### type union

- `WorkItemType = 'story' | 'issue' | 'fix' | 'refactor' | 'chore'`
- `WorkItemSeverity = 'trivial' | 'normal' | 'high'`
- `WorkItemStatus = 'drafted' | 'reflected' | 'implemented' | 'tested'`

3 つの string literal union は domain 語彙として独立公開する（`WorkItemFrontmatter` import なしに参照可能）。

### `WorkItemFrontmatterValidationError`

- `Error` サブクラス
- `name = 'WorkItemFrontmatterValidationError'`
- `message = 'WorkItem frontmatter が不正です: {reason}'`
- 理由文字列で具体フィールドと違反内容を識別する（例: `type 値が enum 外: unknown`）

## 2. 既存モデルへの影響

- `StoryId` / `StoryIdAnnotation` / `DesignDocumentFlags` / `MetadataTag` — **変更なし**
- `parseFrontmatterFlags` / `parseStoryAnnotations` — **変更なし**
- `MetadataValidator` — **本ストーリー非対象**（L2 統合は別 US）

## 3. 設計選択の根拠

### なぜ value object か（enum クラスを作らない）

- `WorkItemType` 等は「表示用文字列 + 等価比較」以上の振る舞いを持たない
- class-based enum は serde のコストに見合わない（frontmatter は plain string）
- 将来振る舞いが増えたら value object へ昇格可能（string → class）

### なぜ `legacyId` を型付きでなく `string` で保持するか

- 移行期間中のみ存在する概念で、リナンバリング完了後は不要
- 値として `ISSUE-026` / `US-001` / 旧 PJ 独自 ID を受容する必要があり、型レベルで絞ると柔軟性を失う
- 検証は「存在すれば非空文字列」のみ

### なぜ既存 `parseFrontmatterFlags` と統合しないか

- 責務分離: `parseFrontmatterFlags` は validator 専用の `initial_creation` flag 取得に閉じている
- 呼び出し側（`MarkdownDesignDocumentGateway`）の契約を破壊したくない
- 将来 `parseFrontmatterFlags` が deprecated になる際も、`parseWorkItemFrontmatter` は生き残る
