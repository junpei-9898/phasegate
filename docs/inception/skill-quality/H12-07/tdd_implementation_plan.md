# TDD実装計画: H12-07 — Work-Item trailer support

@story-id H12-07
設計要素: Work-Item trailer support の RED/GREEN/REFACTOR 手順。

## RED

- `CommitMessage.create(..., "WI-026").format()` が `Work-Item: WI-026` trailerを含むテストを追加する。
- `workItemId` が不正な場合に `INVALID_WORK_ITEM_ID` をthrowするテストを追加する。
- `workItemId` が異なる場合に `equals()` がfalseになるテストを追加する。

## GREEN

- `CommitMessage` に `workItemId?: string` を追加する。
- `create` で `WI-\d+` を検証する。
- `format` と `equals` を更新する。

## Verification

- `pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/skill-quality/commit-message.test.ts`
- `pnpm exec biome check scripts/harness/skill-quality/domain/value-objects/commit-message.ts scripts/harness/__tests__/unit/skill-quality/commit-message.test.ts`
