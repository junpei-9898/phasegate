# 論理設計: H02-04 `@work-item-id` アノテーション併存対応

@story-id H02-04
設計要素: `FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation` の annotation regex を拡張（`@story-id` / `@issue-id` / `@work-item-id` を横断検出）。

- **対応ストーリー**: H02-04
- **対応 Issue**: ISSUE-026 (Phase A-1)
- **Unit**: phase-dependency-model
- **Layer**: infrastructure（`FileSystemStoryReflectionAdapter`）
- **作成日**: 2026-04-24

## 1. 現状の課題

`FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation`（`scripts/harness/phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.ts`）は、product 文書に含まれる story ID アノテーションを `/@story-id[ \t]+([^\n\r]+)/g` の単一 regex で抽出している。

```ts
const pattern = /@story-id[ \t]+([^\n\r]+)/g;
```

ISSUE-026 で採用された WI 一本化（`@work-item-id WI-XXX`）と、移行期間中の `@issue-id ISSUE-XXX` を認識できず、段階移行が実現できない。

## 2. 設計方針

### 2.1 後方互換性を最優先

- 既存の `@story-id` テストケース（`docs/product/construction/phase-dependency-model/unit_test_design.md` の相当セクション）は全て green のまま保つ
- `StoryReflectionFileSystemPort#fileContainsStoryAnnotation(productPath, storyId)` の signature は変更しない（意味論のみ拡張）

### 2.2 アノテーション抽出 regex の汎用化

- 1 つの regex で `@story-id` / `@issue-id` / `@work-item-id` を **キャプチャグループで捕捉**する形に変更
- パターン候補: `/@(story-id|issue-id|work-item-id)[ \t]+([^\n\r]+)/g`
- 抽出後の ID リスト化処理（HTML コメント終端の `-->` 除去、カンマ/空白分割、ID 一致判定）は既存ロジックを流用

### 2.3 命名意図の整合

- メソッド名 `fileContainsStoryAnnotation` は暫定的に据え置く（本ストーリーの非対象）
- 内部ドキュメント（javadoc 相当コメント）のみ、「`@story-id` / `@issue-id` / `@work-item-id` を横断的に検出する」と更新

## 3. 影響範囲

| ファイル | 変更種別 | 内容 |
|---------|--------|------|
| `scripts/harness/phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.ts` | 修正 | `fileContainsStoryAnnotation` の regex パターン拡張 |
| `scripts/harness/__tests__/unit/phase-dependency-model/file-system-story-reflection-adapter.test.ts` | 追加 | `@issue-id` / `@work-item-id` のテストケース追加 |

**影響外**:

- domain 層（`StoryReflectionChecker`, `StoryReflectionConfig`）: 変更なし
- application 層（`CheckStoryReflectionUseCase`）: 変更なし
- port 定義 (`StoryReflectionFileSystemPort`): 変更なし
- 呼び出し側 (`FileSystemStoryReflectionQueryAdapter`): 変更なし

## 4. 非機能要件

- 正規表現のキャプチャ拡張に伴うオーバーヘッドは O(n) のまま（n = ファイルサイズ）
- 既存 product 文書をもう一度走査しても性能劣化しないこと

## 5. テスト戦略（概略）

詳細は `scenario_test_design.md` および product 側 `unit_test_design.md` を参照。本ストーリーは純粋な parser 拡張のため、ユニットテストのみで検証可能（IT 追加不要）。
