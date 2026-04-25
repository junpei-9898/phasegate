# 論理設計: H03-08 WorkItem migration apply

@story-id H03-08
設計要素: WorkItem migration plan を安全に実ファイルへ反映する application usecase と filesystem gateway。

- **対応ストーリー**: H03-08
- **対応 Issue**: ISSUE-026 (Phase B-3)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. 設計方針

`--apply` は破壊的な移動を伴うため、次の安全条件を満たす場合にのみ実行する。

- migration plan に `conflict: true` が1件でもある場合は全件中断する
- `--apply --dry-run` の同時指定は不正入力として拒否する
- target directory は既存なら上書きしない
- description file 以外のファイルは directory rename によりそのまま保持する
- frontmatter 付与は `description.md` の先頭に限定する

## 2. Application Usecase

```ts
export interface ApplyWorkItemMigrationOutput {
  readonly applied: readonly WorkItemMigrationAppliedCandidate[];
  readonly skipped: readonly WorkItemMigrationCandidate[];
  readonly warnings: readonly string[];
  readonly blocked: boolean;
}
```

Usecase は `PlanWorkItemMigrationUseCase` と apply port を組み合わせる。conflict がある場合は apply port を呼ばない。

## 3. Infrastructure Gateway

`FileSystemWorkItemMigrationApplyGateway` は candidate 単位で次を行う。

1. target parent directory を作成する
2. source directory を target directory へ `rename` する
3. `issue_description.md` の場合は `description.md` へ rename する
4. `description.md` に frontmatter が無ければ `frontmatterPreview` を先頭に付与する

## 4. Presentation

`MigrateWorkItemsCommandHandler` は `--apply` 指定時に apply usecase を呼び、human / JSON で applied / skipped / warnings を表示する。`blocked: true` の場合は終了コード1、入力不正または想定外エラーは終了コード2を返す。
