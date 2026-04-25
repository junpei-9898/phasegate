# TDD実装計画: H02-06 — WI frontmatter affects-aware story reflection

@story-id H02-06
設計要素: WI frontmatter aware reflection の RED/GREEN/REFACTOR 手順。

## RED

- `StoryReflectionChecker` に `_cross/WI-*` の inception パスを解決し、対象Unitでは未反映 violation を返すテストを追加する。
- `affects` 対象外のUnitでは同じ WI をskipするテストを追加する。
- `FileSystemStoryReflectionAdapter#storyAffectsUnit` に `affects: [unit-a, unit-b]` の検出テストを追加する。

## GREEN

- `StoryReflectionFileSystemPort` に `storyAffectsUnit(storyId, unitId)` を追加する。
- `StoryReflectionChecker` に通常パスと `_cross` パスの候補解決を追加する。
- `FileSystemStoryReflectionAdapter` にfrontmatterの軽量パーサを追加する。

## REFACTOR

- 既存 story / unit-owned WI / cross WI の分岐が読みやすいように、inception path解決を小さなprivate methodへ分離する。

## Verification

- `pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/phase-dependency-model`
- `pnpm exec biome check`（変更TSファイル限定）
