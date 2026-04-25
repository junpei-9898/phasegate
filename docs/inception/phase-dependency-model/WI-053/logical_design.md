# 論理設計: H02-06 — WI frontmatter affects-aware story reflection

@story-id H02-06
設計要素: WI frontmatter の `affects` に基づく story reflection 判定。

## 1. 対象

対象は `StoryReflectionChecker` と `StoryReflectionFileSystemPort`、および `FileSystemStoryReflectionAdapter` である。

## 2. 判定方針

`StoryReflectionChecker` は storyId ごとに inception 側の実在パスを解決する。

- 通常: `mapping.resolve({ unitId, storyId })`
- 通常パスが存在せず、storyId が `WI-*` の場合: `mapping.resolve({ unitId: "_cross", storyId })`

cross WI パスを使う場合は `StoryReflectionFileSystemPort#storyAffectsUnit(storyId, unitId)` を呼び出し、`affects` に対象Unitが含まれない場合は該当storyIdをskipする。

## 3. frontmatter 解釈

`FileSystemStoryReflectionAdapter` は `docs/inception/_cross/{WI}/description.md` のfrontmatterを読み取る。

- `affects: [a, b]` をサポートする。
- `affects` がない、ファイルがない、読み取りに失敗した場合は `true` を返す。
- これは欠落メタデータでゲートが過剰に素通りするより、既存の保守的な反映チェックに戻すためである。

## 4. 非対象

`type` ごとの最終ポリシー分岐や `type=unit` の厳密解釈は後続の拡張対象とする。C-3では `affects` による Unit 絞り込みを最小単位で導入する。
