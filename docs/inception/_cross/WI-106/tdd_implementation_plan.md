# TDD実装計画: WI-106 inception WI ID 重複防止

@work-item-id WI-106

## 対象

- `docs/inception/**/WI-XXX/description.md` の frontmatter `id` を検証する。
- `_cross` と Unit 配下を区別せず、`id: WI-XXX` は inception 全体で 1 件のみ許可する。
- parent directory 名 `WI-XXX` と frontmatter `id` の不一致を検出する。
- `migrate work-items` の採番は既に `_cross` と Unit 配下の WI directory を参照しているため、回帰テストを追加して仕様を固定する。

## 実装方針

1. `traceability-model` に WI identity scan 用 port / service を追加する。
2. `validate-metadata` の design document 検証で、対象が `docs/inception/**/WI-XXX/description.md` の場合だけ global scan を実行し、重複・不一致を `L2-002` error として返す。
3. `FileSystemWorkItemMigrationSourceGateway.listExistingWorkItemIds()` は現行実装が `_cross` と Unit 配下を走査済みなので、重複しない採番をテストで固定する。
4. `docs/folder_management_rules.md` / `AGENTS.md` に最小限の運用ルールを追記する。

## Red

- `_cross/WI-200/description.md` と `agent-integration/WI-200/description.md` が同じ `id: WI-200` を持つ fixture で validation fail。
- `docs/inception/_cross/WI-201/description.md` の frontmatter が `id: WI-202` の fixture で validation fail。
- `migrate work-items` planner が `_cross/WI-001` と Unit 配下 `WI-002` を既存番号として避けることを確認。

## Green

- duplicate / mismatch を `L2-002` error に変換する。
- 現行 repository の `docs/inception/_cross/WI-106/description.md` は validation pass。

## Verification

- `pnpm exec vitest` の関連テスト。
- `pnpm harness:check-ready`。
- `pnpm exec tsx scripts/harness/main.ts validate-metadata docs/inception/_cross/WI-106/description.md --json`。
