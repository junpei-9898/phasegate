# 論理設計: H03-07 WorkItem migration CLI dry-run

@story-id H03-07
設計要素: H03-06 の migration plan usecase を presentation handler と CLI dispatch に接続する。

- **対応ストーリー**: H03-07
- **対応 Issue**: ISSUE-026 (Phase B-2)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. 設計方針

Phase B-2 は実ファイル移動を行わない。`migrate work-items` は `--dry-run` を必須にし、`--apply` は後続 Phase B-3 まで拒否する。既存の `migrate --schema v3` は config-foundation の責務として維持し、`work-items` サブコマンドが指定された場合のみ traceability-model へ dispatch する。

## 2. Presentation Handler

```ts
export interface MigrateWorkItemsCommandInput {
  readonly dryRun?: boolean;
  readonly apply?: boolean;
  readonly json?: boolean;
}

export interface MigrateWorkItemsCommandOutput {
  readonly exitCode: 0 | 1 | 2;
  readonly text: string;
}
```

handler は `PlanWorkItemMigrationUseCase` を呼び出し、plan の表示だけを行う。ファイル作成・rename・削除は行わない。

### 終了コード

| 条件 | exitCode |
|------|----------|
| dry-run plan に conflict がない | 0 |
| dry-run plan に conflict がある | 1 |
| `--dry-run` 未指定 / `--apply` 指定 / 想定外エラー | 2 |

## 3. CLI Dispatch

`scripts/harness/main.ts` の `migrate` case で `args[1] === "work-items"` を先に判定し、traceability-model の handler へ渡す。それ以外は従来の config schema migration を実行する。

## 4. テスト方針

- handler unit test で human/json 出力、conflict exit、dry-run 必須を検証する
- main CLI は既存 migrate 分岐を壊さないよう、サブコマンド判定のみを最小追加する
