# TDD 実装計画: H02-05 WI-aware story reflection listing

@story-id H02-05
設計要素: ISSUE-026 Phase C-1 として、story reflection の列挙処理を WI-aware にする。

- **対応ストーリー**: H02-05
- **対応 Issue**: ISSUE-026 (Phase C-1)
- **Unit**: phase-dependency-model
- **作成日**: 2026-04-24

## 1. TDD 順序

### Step 1 RED

- Unit直下の `WI-*` が列挙されること
- `_cross/WI-*` が列挙されること
- `{unit}/issues` と `_cross` の非WIディレクトリが除外されること

### Step 2 GREEN

`FileSystemStoryReflectionAdapter#listStoryDirectories` 内で unit-owned と cross WI の2系統を読み、重複排除して返す。

### Step 3 回帰確認

```bash
pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/phase-dependency-model/file-system-story-reflection-adapter.test.ts
pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/phase-dependency-model
pnpm harness:status
```
