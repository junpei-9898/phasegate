# TDD実装計画: H02-07 — WI annotation legacy compatibility

@story-id H02-07
設計要素: legacy issue annotation compatibility の RED/GREEN/REFACTOR 手順。

## RED

- `FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation` に、`legacy_id` 経由で `@issue-id` を `WI-*` の反映として検出するテストを追加する。
- `legacy_id` がない場合、旧IDだけではWI反映にならないテストを追加する。

## GREEN

- product annotation抽出をprivate helperへ分離する。
- `_cross/WI-*/description.md` のfrontmatterから `legacy_id` を読み取る helper を追加する。
- direct IDまたはlegacy IDのどちらかが含まれれば true を返す。

## Verification

- `pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/phase-dependency-model/file-system-story-reflection-adapter.test.ts`
- `pnpm exec biome check`（変更TSファイル限定）
