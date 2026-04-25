# WI-026 残作業計画 — `_cross/WI-XXX` dead-lock 解消と移行残債清掃

@story-id H02-04
種別: 非 WI 横断計画（`_shared/`）。親 WI: WI-026（legacy: ISSUE-026, story-id 互換: H02-04）
> 起票日: 2026-04-25
> 親 WI: [WI-026](../_cross/WI-026/description.md)
> 起点: 2026-04-25 のドッグフード（codex 実装の検証）で受け入れ基準と実装の不整合を 1 件発見

## 背景

WI-026 の codex 実装はテスト 3438 件 PASS、L3 全 PASS、`legacy_id` 解決 / `affects` ベースの cross-unit ゲートも仕様通り動作することを確認済み。一方で、**`_cross/WI-XXX/` 配下の inception 文書を新規作成・更新できない致命 dead-lock** が残っており、WI-026 自身が AC を満たしていない。本計画は WI-026 を真の意味で完了させるための残作業を整理したもの。

## ドッグフードで観測した dead-lock の連鎖

1. `WriteTargetScope.fromPath` (`agent-integration/domain/value-objects/write-target-scope.ts:86-88`) が `docs/inception/_cross/WI-XXX/...` への書込を **Level 3 + unitId="_cross" + storyId=WI-XXX** で返す
2. `StoryReflectionChecker.resolveInceptionPath` (`phase-dependency-model/domain/services/story-reflection-checker.ts:84-89`) が normalPath（`docs/inception/_cross/WI-XXX/logical_design.md`）の存在をもって `isCrossWorkItem: false` を返す
3. その結果 `storyAffectsUnit` の skip 路に乗らず、存在しない仮想パス `docs/product/construction/_cross/logical_design.md` への反映を要求する
4. `_cross/` 配下の他の WI（WI-001, WI-025）に未反映があると、関係ない新規 WI 起票や WI-026 自身の追加設計入力すら block される

```
$ printf '{"tool_name":"Write","tool_input":{"file_path":"docs/inception/_cross/WI-027/description.md","content":"x"}}' \
  | npx tsx scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts
[L2-STORY-REFLECTION] docs/product/construction/_cross/logical_design.md に
@story-id WI-001 が反映されていません ...
EXIT: 2
```

## ギャップ一覧

| ID | ギャップ | 受け入れ基準上の position | 深刻度 |
|---|---|---|---|
| GAP-1 | `_cross/WI-XXX/` inception 編集が常時 block | "新規 WI 起票が PhaseGate 上で行える" 暗黙前提 | 致命（dead-lock） |
| GAP-2 | 空の `docs/inception/issues/` ディレクトリ残存 | "docs/inception/issues/ と docs/inception/{unit}/issues/ が廃止される" | 中 |
| GAP-3 | `H{NN}-{NN}` 形式の旧ストーリー dir が多数残存（frontmatter 無し）。`migrate work-items --dry-run` が candidates: 0 を返す | "全 work item が WI-XXX に統一される" / "`migrate work-items` が実行できる" | 中 |
| GAP-4 | `WriteTargetScope.fromPath` / `FileSystemStoryReflectionAdapter` に旧 `issues` 系統のコード分岐が残存 | "issues 特殊分岐が削除される" | 低 |
| GAP-5 | L2-STORY-REFLECTION のメッセージが `@story-id WI-XXX` と表示（新仕様では `@work-item-id`） | "`@work-item-id` への命名統一" | 低 |
| GAP-6 | WI-026 description.md が `status: implemented` だが上記 GAP のため AC 未達 | description.md の記述整合 | 低 |

## 進捗状況 (2026-04-25)

| Phase | 状態 | コミット / 備考 |
|---|---|---|
| G1 | ✅ 完了 | `922f5d3` (v0.103.0) |
| G2-3 | ✅ 完了 | 空 `docs/inception/issues/` 削除 |
| G2-4 | ✅ 完了 | `WriteTargetScope` の legacy `issues` 分岐削除 |
| G2-5 | ✅ 完了 | `FileSystemStoryReflectionAdapter` の `issues` filter 削除 |
| G3 | ✅ 完了 | `WI-` 始まり storyId は `@work-item-id` を出力 |
| G4-1 | ✅ 完了 | WI-026 description.md `status: implemented` → `drafted` 訂正 |
| G4-2 | ✅ 完了 | Phase 3 仕様文言を G1 方針に合わせて訂正 |
| G4-3 | ✅ 完了 | AC チェックボックスを実態と一致 |
| G2-1 / G2-2 | 🔜 別 WI に分離（**WI-027** 起票予定） | H-ID → WI-XXX 一斉リネーム + `StoryId` VO 拡張 + 移行スクリプト H-ID 対応 |

## 修正フェーズ

### G1. `_cross/WI-XXX` inception 編集 dead-lock 解消（最優先）

**採用案: B（HandlePreToolUseUseCase で inception パス書込を reflection check 対象外にする）**

| 案 | 概要 | 採否 |
|---|---|---|
| A | `WriteTargetScope` で `_cross/WI-XXX/` を Level 1 にする | 仕様文言と矛盾するため不採用 |
| **B** | `resolveStoryReflectionScope` で `docs/inception/**` への書込は reflection check skip、`scripts/harness/{unit}/...` のみ check 対象 | **採用**。Phase 3 = 実装（ソース）という仕様の semantic と一致 |
| C | `StoryReflectionChecker.resolveInceptionPath` で `_cross` を正規化 | 暗黙前提に依存し脆い、不採用 |

**タスク**:

- G1-1 `handle-pre-tool-use-usecase.ts:resolveStoryReflectionScope` に inception パス skip 分岐を追加
- G1-2 既存 `scripts/harness/{unit}/...` 書込での reflection check は維持されることを保証
- G1-3 integration test：`_cross/WI-099/{description,logical_design}.md` 新規作成が pass、agent-integration ソース書込で WI-001 reflection が依然要求される

**実装スキル**: `quick-implementor`（既存ロジックのバグ修正 — 新ドメインモデルなし、API 契約変更なし）

### G2. 移行残債の物理掃除

**前提: G1 完了後**（G1 が壊れていると `_cross` を触れず回帰検出不能）

- G2-1 `work-item-migration-planner` / `file-system-work-item-migration-source-gateway` を **H-ID 検出**に拡張（`H\d{2}-\d{2}` パターン）
- G2-2 `apply-work-item-migration-usecase` を実行し H-ID → 連番 WI-XXX へリネーム + frontmatter（`type: story`, `legacy_id: H02-04` 等）注入
- G2-3 空の `docs/inception/issues/` を `git rm -r`
- G2-4 `WriteTargetScope.fromPath:80-83, 95-101` の旧 issues 分岐を削除
- G2-5 `FileSystemStoryReflectionAdapter#listUnitWorkItemDirectories:62` の `name !== "issues"` フィルタを削除

**実装スキル**:
- G2-1 / G2-2: `story-implementor`（traceability-model の planner / applier 拡張は新ロジック）
- G2-3〜G2-5: `quick-implementor`（旧コードパス削除）

### G3. アノテーション/メッセージ統一

- G3-1 L2-STORY-REFLECTION メッセージで storyId が `WI-` 始まりならば `@work-item-id` を出力
- G3-2 コードベースの `// @story-id WI-XXX` を `// @work-item-id WI-XXX` に書換（legacy ID は据置）

**実装スキル**: `quick-implementor`

### G4. WI-026 仕様/ステータス整合

- G4-1 `_cross/WI-026/description.md` の `status` を `implemented` → `drafted` に戻し、AC のチェックボックスを実態に合わせる
- G4-2 仕様文言「`_cross/{WI-XXX}/` も Level 3 + workItemId として扱う」を G1 採用案 B に合わせて訂正
- G4-3 G1〜G3 完了後、AC 全項目を再評価して PASS に戻す

## 実行順序

```
G1 ──┬──→ G4-1 (status 訂正は G1 完了で戻せる)
     │
     ├──→ G2-1 → G2-2 ──→ G2-3 ──→ G2-4 → G2-5
     │                              (legacy code path 削除は H-ID 移行完了後)
     │
     └──→ G3 ──→ G4-2 → G4-3 (close)
```

## 検証

各フェーズ完了時に以下のドッグフードを再実行:

```bash
# G1 検証
printf '{"tool_name":"Write","tool_input":{"file_path":"docs/inception/_cross/WI-099/description.md","content":"x"}}' \
  | npx tsx scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts
# 期待: EXIT 0（inception 書込は gate 対象外）

# G1 回帰
printf '{"tool_name":"Write","tool_input":{"file_path":"scripts/harness/agent-integration/domain/services/dummy.ts","content":"x"}}' \
  | npx tsx scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts
# 期待: EXIT 2（WI-001 reflection を依然要求）

# G2-1/2 検証
npx tsx scripts/harness/main.ts migrate work-items --dry-run
# 期待: H-ID が candidates に列挙される（現状は 0）

# G2-3 後
find docs/inception -name "issues" -type d
# 期待: 何も出ない

# 全フェーズ完了後
npm test -- --run
npx tsx scripts/harness/main.ts validate --layer L2 --format human
npx tsx scripts/harness/main.ts validate --layer L3 --format human
```

## 関連

- 親 WI: [WI-026](../_cross/WI-026/description.md)
- 関連バグの該当箇所:
  - `scripts/harness/agent-integration/domain/value-objects/write-target-scope.ts:86`
  - `scripts/harness/phase-dependency-model/domain/services/story-reflection-checker.ts:84`
  - `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts:resolveStoryReflectionScope`
