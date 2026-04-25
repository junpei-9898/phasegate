---
id: WI-027
type: refactor
severity: normal
status: drafted
affects: [traceability-model, phase-dependency-model]
---

# WI-027: H-ID 形式の旧 work item を `migrate work-items` の対象に拡張

> 起票日: 2026-04-25
> 親 WI: [WI-026](../WI-026/description.md)
> 起点: WI-026 残作業計画 ([wi-026-remediation-plan.md](../../_shared/wi-026-remediation-plan.md)) の G2-1 / G2-2 を切り出し

## 背景

WI-026 で導入された `npx phasegate migrate work-items` は `ISSUE-XXX` / `WI-XXX` 形式のディレクトリのみを candidates として扱う。一方、PhaseGate 自身の inception には `H{NN}-{NN}` 形式（例: `H02-04`, `H09-01` 等）の旧ストーリーディレクトリが **57 件** 残存しており、現状の dry-run は `candidates: 0` を返す。

## 現状（2026-04-25）

- `H{NN}-{NN}` 形式 directory: 57 件（`docs/inception/{unit}/H{NN}-{NN}/`）
- frontmatter なし、`description.md` がない directory が 44 件存在
- 既存 WI-XXX: WI-001..WI-026（全て `_cross/` 配下）
- `WorkItemMigrationPlanner.toWorkItemId` は `^(?:WI-|ISSUE-)` のみ match → H-ID は `unsupported legacy id` warning で skip
- `FileSystemWorkItemMigrationSourceGateway.ISSUE_DIR_PATTERN` (`/^(?:ISSUE|WI)-\d+$/`) は H-ID directory を列挙しない
- 結果: 「全 work item が WI-XXX に統一される」 (WI-026 AC) が満たせない

## 本 WI でやること

### G2-1: planner / gateway の H-ID 検出拡張

1. `FileSystemWorkItemMigrationSourceGateway` を `H\d{2}-\d{2}` directory 列挙に対応させる
   - `docs/inception/{unit}/H{NN}-{NN}/` を walk
   - `_cross/`, `_shared/`, `_operation/`, `issues` は引き続き skip
2. `WorkItemMigrationPlanner` を H-ID kind の sequential 採番に拡張
   - 既存 WI-XXX 番号を `usedIds` として参照し、空き番号を若い順に割り当て
   - H-ID 採番は `WorkItemMigrationSourcePort#listExistingWorkItemIds()`（新設）で取得
3. H-ID から生成された WI の `frontmatterPreview` を `type: story` + `legacy_id: H{NN}-{NN}` に切替

### G2-2: 実マイグレーション実行

1. `npx phasegate migrate work-items --apply` を実行
2. すべての H-ID directory を WI-XXX にリネーム
3. `description.md` 不在の directory には既存 apply gateway の stub 生成ロジックで `# H{NN}-{NN}` を含む description.md を生成 + frontmatter 注入

## 受け入れ基準

- [ ] `FileSystemWorkItemMigrationSourceGateway.listLegacyIssueDirectories()` が `docs/inception/{unit}/H{NN}-{NN}/` を `LegacyIssueDirectory` として返す
- [ ] `WorkItemMigrationSourcePort#listExistingWorkItemIds()` が既存 WI-XXX directory（`_cross/` + `{unit}/`）の ID を列挙する
- [ ] `WorkItemMigrationPlanner.plan()` が H-ID entry に対し、`existingWorkItemIds` と embedded id（ISSUE-XXX）の両方を考慮した上で **空き番号の若い順** に sequential WI-XXX を割り当てる
- [ ] H-ID 由来 candidate の `frontmatterPreview` に `type: story` と `legacy_id: H{NN}-{NN}` が含まれる
- [ ] 既存 ISSUE-XXX / WI-XXX 移行ロジック（embedded number → 同番号）に regression がない（既存テスト全 PASS）
- [ ] `npx phasegate migrate work-items --dry-run` 実行で 57 件の H-ID directory が candidates に列挙される
- [ ] `npx phasegate migrate work-items --apply` 実行後、すべての H-ID directory が `docs/inception/{unit}/WI-XXX/` にリネームされ、`description.md` の frontmatter に `legacy_id: H{NN}-{NN}` が記録される
- [ ] `git log --grep='H02-04'` 等の旧 ID 検索が `legacy_id` 経由で grep 互換を維持する（直接 directory 名 grep は対象外）

## 同梱修正（migrate 適用後の dead-lock 解消）

`migrate work-items --apply` 実施直後、`FileSystemStoryReflectionAdapter#readLegacyId` が `_cross/{WI-XXX}/description.md` のみを参照していたため、unit-scoped WI（traceability-model/WI-074 等）に対する legacy_id 解決が機能せず、product 側の既存 `@story-id H{NN}-{NN}` が反映として認識されない dead-lock が発生した。

WI-027 の operational 完了条件として以下を同梱する:

- `FileSystemStoryReflectionAdapter#readLegacyId` を `_cross/{WI-XXX}/description.md` + `{unit}/{WI-XXX}/description.md` の両方から検索するよう拡張
- 単体テストで unit-scoped WI の legacy_id 解決を回帰
- `affects: [traceability-model, phase-dependency-model]` として phase-dependency-model 側 product にも reflection 追記

## スコープ外

- product 文書 / コードベース内の `@story-id H{NN}-{NN}` を `@work-item-id WI-XXX` に書換える作業（legacy ID として据置、別途検討）
- ストーリーカタログ (`docs/product/decision/user_stories.md`) の同期
- `WI-` / `ISSUE-` / `H-` 以外の旧 ID 形式（US-, F-, FX- 等）の追加対応
- WI-026 description.md の AC「全 work item が WI-XXX に統一される」のチェックボックス更新（本 WI 完了後に WI-026 側を update）

## 関連

- 親 WI: [WI-026](../WI-026/description.md)
- 残作業計画: [`docs/inception/_shared/wi-026-remediation-plan.md`](../../_shared/wi-026-remediation-plan.md) の G2-1 / G2-2
- 改修対象 (Unit: traceability-model):
  - `scripts/harness/traceability-model/infrastructure/gateways/file-system-work-item-migration-source-gateway.ts`
  - `scripts/harness/traceability-model/domain/services/work-item-migration-planner.ts`
  - `scripts/harness/traceability-model/domain/ports/work-item-migration-source-port.ts`
  - `scripts/harness/traceability-model/domain/value-objects/work-item-migration-candidate.ts`
