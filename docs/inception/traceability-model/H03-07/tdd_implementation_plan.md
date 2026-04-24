# TDD 実装計画: H03-07 WorkItem migration CLI dry-run

@story-id H03-07
設計要素: ISSUE-026 Phase B-2 として、WorkItem migration dry-run plan を CLI から実行可能にする。

- **対応ストーリー**: H03-07
- **対応 Issue**: ISSUE-026 (Phase B-2)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. スコープ

### 1.1 対象

- `MigrateWorkItemsCommandHandler` の追加
- `createTraceabilityModelModule` への usecase / gateway / handler wiring
- `phasegate migrate work-items --dry-run` の CLI dispatch
- handler unit test の追加

### 1.2 非対象

- 実ファイル移動
- frontmatter の実書き込み
- gate logic refresh

## 2. TDD 実装順序

### Step 2.1 RED

- `--dry-run` なしでは終了コード2
- dry-run plan を human text で表示
- `--json` では machine readable JSON を表示
- conflict がある場合は終了コード1

### Step 2.2 GREEN

handler を presentation 層に追加し、usecase の戻り値を最小限フォーマットする。

### Step 2.3 CLI wiring

composition-root に `PlanWorkItemMigrationUseCase` と `FileSystemWorkItemMigrationSourceGateway` を接続し、`main.ts` の `migrate work-items` だけ traceability-model へ流す。

### Step 2.4 回帰確認

```bash
pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/traceability-model
pnpm exec biome check <changed-files>
pnpm harness:status
```
