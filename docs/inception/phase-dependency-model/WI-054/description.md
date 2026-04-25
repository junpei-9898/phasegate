---
id: H02-07
unit: phase-dependency-model
type: story
issue: ISSUE-026
phase: C-4
created: 2026-04-24
---

# H02-07: WI annotation legacy compatibility

## 背景

Phase A-1で product 文書の `@work-item-id` 検出を追加したが、Phase Bで移行された既存WIには `legacy_id: ISSUE-XXX` が残っている。移行期間中は product 文書側に旧 `@issue-id ISSUE-XXX` が残っていても、対応する `WI-XXX` の反映として扱う必要がある。

## 要求

- `@work-item-id WI-XXX` は従来通り直接検出する。
- `_cross/WI-XXX/description.md` のfrontmatterに `legacy_id: ISSUE-XXX` がある場合、product 文書の `@issue-id ISSUE-XXX` を `WI-XXX` の反映として扱う。
- legacy_id がない場合は direct ID のみを検出する。

## 完了条件

- `FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation(productPath, "WI-001")` が、product側 `@issue-id ISSUE-001` と WI frontmatter `legacy_id: ISSUE-001` の組み合わせで true を返す。
- 既存 `@story-id` / `@issue-id` / `@work-item-id` の直接検出は維持される。
