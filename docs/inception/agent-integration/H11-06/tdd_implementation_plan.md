# TDD実装計画: H11-06 — WI cross layout write target scope

@story-id H11-06
設計要素: `_cross/WI-*` パス解決の RED/GREEN/REFACTOR 手順。

## Phase 1: RED

`scripts/harness/__tests__/unit/agent-integration/write-target-scope.test.ts` に以下を追加する。

- `docs/inception/_cross/WI-026/description.md` が `level=3`, `unitId="_cross"`, `storyId="WI-026"` になる。
- `custom/inception/_cross/WI-026/description.md` がカスタム inception root でも同じ結果になる。
- `docs/inception/_cross/memo.md` が `level=1` になり、storyId を持たない。

## Phase 2: GREEN

`WriteTargetScope.fromPath()` の `inceptionMatch` 判定に `_cross` 専用分岐を追加する。

- `unitId === "_cross"` かつ `secondSegment` が `WORK_ITEM_ID_PATTERN` に一致する場合は Level 3。
- `unitId === "_cross"` のその他ケースは Level 1。

## Phase 3: REFACTOR

既存の `issues` / `US` / `WI` 判定との順序を見直し、特殊ディレクトリの分岐が通常Unit判定より前に評価されるようにする。

## Verification

- `pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/agent-integration/write-target-scope.test.ts`
- `pnpm exec biome check scripts/harness/agent-integration/domain/value-objects/write-target-scope.ts scripts/harness/__tests__/unit/agent-integration/write-target-scope.test.ts`
