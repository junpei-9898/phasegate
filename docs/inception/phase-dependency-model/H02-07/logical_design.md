# 論理設計: H02-07 — WI annotation legacy compatibility

@story-id H02-07
設計要素: legacy `ISSUE-*` annotation と `WI-*` の互換解決。

## 1. 対象

対象は `FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation` である。`StoryReflectionChecker` は引き続き `storyId` を渡すだけで、legacy alias の解決はI/Oを持つfilesystem adapterに閉じ込める。

## 2. 判定順序

1. product 文書内のannotationからID一覧を抽出する。
2. `storyId` と直接一致すれば true。
3. `storyId` が `WI-*` の場合、`docs/inception/_cross/{storyId}/description.md` のfrontmatterから `legacy_id` を読み取る。
4. `legacy_id` が抽出でき、annotation ID一覧に含まれていれば true。
5. それ以外は false。

## 3. 後方互換

frontmatterが読めない場合、直接一致のみで判定する。旧 `@story-id` / `@issue-id` の既存呼び出しは従来通り直接ID一致で動く。
