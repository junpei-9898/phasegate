# TDD 実装計画: H02-04 `@work-item-id` アノテーション併存対応

@story-id H02-04
設計要素: RED → GREEN → REFACTOR の TDD 実装順序と Unit テスト 6 ケース（UT-PD-153〜158）の紐付け計画。

- **対応ストーリー**: H02-04
- **対応 Issue**: ISSUE-026 (Phase A-1)
- **Unit**: phase-dependency-model
- **作成日**: 2026-04-24

## 1. スコープ

### 1.1 対象ストーリーと受け入れ基準

H02-04（`docs/product/user_stories.md` 参照）の AC-1〜AC-6。

- AC-1: `@story-id` / `@issue-id` / `@work-item-id` いずれでも ID 検出可能
- AC-2: いずれのアノテーションもカンマ/空白区切り複数 ID に対応
- AC-3: HTML コメント形式で検出可能
- AC-4: 既存 `@story-id` ユニットテストが全て green のまま
- AC-5: 新規テストが unit_test_design.md に追加済み（UT-PD-153〜158）
- AC-6: `StoryReflectionFileSystemPort#fileContainsStoryAnnotation` の signature 据え置き（内部振る舞いのみ拡張）

### 1.2 影響する層

| 層 | 影響 | 変更ファイル |
|---|------|------------|
| domain | なし | — |
| application | なし | — |
| infrastructure | **あり** | `scripts/harness/phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.ts` |
| presentation | なし | — |
| テスト（unit） | **あり** | `scripts/harness/__tests__/unit/phase-dependency-model/file-system-story-reflection-adapter.test.ts` |
| テスト（integration） | なし | — |

## 2. 前提条件検証

- `implementation-readiness-checker` 実行日時: **2026-04-24**（メインセッション手動実行）
- 判定結果: **✅ 実装準備完了**（推奨ファイル含めて全揃い）

## 3. TDD 実装順序

純粋な parser 拡張であるため **Unit テストのみ**で完結する。IT / シナリオテストは追加しない。

### Step 3.1 Unit テスト (RED)

既存ファイル `scripts/harness/__tests__/unit/phase-dependency-model/file-system-story-reflection-adapter.test.ts` に以下 6 つの `it` ケースを追加する。

| ケース ID | target section | context | it（期待値） |
|----------|---------------|---------|------------|
| UT-PD-153 | `FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation` | product 文書に `@issue-id ISSUE-026` がある場合 | `ISSUE-026` に対し true、未知 ID に false |
| UT-PD-154 | 同上 | product 文書に `@work-item-id WI-001` がある場合 | `WI-001` に対し true、未知 ID に false |
| UT-PD-155 | 同上 | `<!-- @work-item-id WI-001 -->` がある場合 | `WI-001` に対し true |
| UT-PD-156 | 同上 | `@work-item-id WI-001, WI-002, WI-003` がある場合 | `WI-001` / `WI-002` / `WI-003` 全てに true |
| UT-PD-157 | 同上 | 同一ファイルに `@story-id H02-04` と `@work-item-id WI-001` がある場合 | `H02-04` / `WI-001` 両方に true |
| UT-PD-158 | 同上 | `@work-item-id WI-001` のみ存在して `WI-999` を問い合わせた場合 | false |

全て **Arrange（tmp dir に product 文書を書く）→ Act（`adapter.fileContainsStoryAnnotation()`）→ Assert（boolean）** の AAA パターン。既存 UT と同じ構造を踏襲する。

### Step 3.2 Unit 実装 (GREEN)

`file-system-story-reflection-adapter.ts` の `fileContainsStoryAnnotation` 内 regex を次のように変更する:

```ts
// Before
const pattern = /@story-id[ \t]+([^\n\r]+)/g;

// After
const pattern = /@(story-id|issue-id|work-item-id)[ \t]+([^\n\r]+)/g;
let match: RegExpExecArray | null;
while ((match = pattern.exec(content)) !== null) {
  const raw = match[2].replace(/-->.*$/, '');
  // ... 以下既存ロジック
}
```

- `match[1]` = アノテーション種別（本ストーリーでは未使用、将来拡張用）
- `match[2]` = ID リスト本体
- それ以外の ID 分割・トリム処理は据え置き

あわせて class header コメント（「ファイルシステム上の docs/inception ディレクトリ列挙と…」の部分）を 1 行更新し、`@story-id` / `@issue-id` / `@work-item-id` を横断検出することを明記する。

### Step 3.3 REFACTOR

- 必要に応じて regex を named capture group 化して意図を明示 (`(?<kind>story-id|issue-id|work-item-id)`)
- 変数名 `pattern` → `annotationPattern` へのリネームは任意。コミット分割の観点では別コミット推奨

### Step 3.4 回帰確認

```bash
npm run test -- file-system-story-reflection-adapter.test
npm run test
```

- 対象テスト ファイル単体 green
- 全テスト suite green（既存の reflection checker / use case / adapter の振る舞いが退行していないこと）

## 4. 環境検証チェックリスト

- [x] Node / Vitest 環境: 既存 CI と同じ
- [x] 対象ファイル存在: `file-system-story-reflection-adapter.ts`, 対応テスト ファイル
- [x] 他 Unit への波及なし（adapter は package-private 用途）

## 5. QA（不明点・確認事項）

なし。本ストーリーは閉じた infrastructure 層単体の変更であり、関連 port の signature 据え置きも logical_design.md で明記済み。

## 6. 前提条件・リスク

### 前提条件

- 既存 `@story-id` 検出の regex 挙動（特に HTML コメント終端処理 `.replace(/-->.*$/, '')`）が現行テストで仕様化されていること → 確認済み（`file-system-story-reflection-adapter.test.ts:157-181`）

### リスク

| リスク | 影響度 | 緩和策 |
|------|------|------|
| regex 変更で既存 `@story-id` 検出が退行する | 高 | 既存 4 テストケースを**変更せず**そのまま green に保つ（AC-4） |
| `@work-item-id` の `-` を含む ID（WI-001 等）で regex がハイフンを境界と誤認する | 低 | `[^\n\r]+` で 1 行末まで取り、その後分割処理に任せる（既存ロジックと同等） |
| `@issue-id ISSUE-026` の `ISSUE-` の `-` が捕捉規則を壊す | 低 | 上記同様、capture は行末まで貪欲に取るので問題ない |

## 7. コミット分割方針

Atomic Git Commits の原則に従い、以下 3 コミットに分ける:

1. `test: H02-04 @work-item-id / @issue-id アノテーション検出テスト追加 (RED)`
2. `feat: H02-04 fileContainsStoryAnnotation に @issue-id / @work-item-id サポート追加 (GREEN)`
3. （必要なら）`refactor: H02-04 annotation regex を named capture group 化 (REFACTOR)`

各コミットで `npm run test` が green であることを確認する（RED コミットはその時点で新規テストのみ failing、既存テストは green — 便宜的に failing テストを含むコミットは `[RED]` タグ付きで許容）。

---

## Phase 2 開始条件

- 本計画をユーザーがレビューし **承認**
- QA セクションに未解決 [Question] が残っていないこと（現状なし）

承認後、Step 3.1 → 3.2 → 3.3 → 3.4 の順で TDD 実装を行う。
