# TDD 実装計画: H03-08 WorkItem migration apply

@story-id H03-08
設計要素: ISSUE-026 Phase B-3 として、WorkItem migration apply をTDDで追加する。

- **対応ストーリー**: H03-08
- **対応 Issue**: ISSUE-026 (Phase B-3)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. スコープ

- Apply usecase
- Apply port / filesystem gateway
- `migrate work-items --apply` handler 分岐
- unit tests

## 2. TDD 順序

### Step 2.1 RED

- conflict がある plan では apply port が呼ばれない
- conflict がない plan では candidates が apply される
- filesystem gateway が directory move、description rename、frontmatter 付与を行う
- handler が `--apply` を実行し、`--apply --dry-run` を拒否する

### Step 2.2 GREEN

最小限の usecase / port / gateway / handler 変更でテストを通す。

### Step 2.3 回帰確認

```bash
pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/traceability-model
pnpm exec biome check <changed-files>
pnpm harness:status
```
