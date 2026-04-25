---
work_item_id: WI-027
unit: traceability-model
---

# WI-027 論理設計（差分） — H-ID detection on `migrate work-items`

@work-item-id WI-027

## 0. 概要

既存の `WorkItemMigrationPlanner` / `FileSystemWorkItemMigrationSourceGateway` を拡張し、`docs/inception/{unit}/H{NN}-{NN}/` 形式の旧ストーリーディレクトリを `migrate work-items` の対象に含める。新規 Aggregate / 新規 UseCase は追加しない。

`docs/product/construction/traceability-model/logical_design.md` の「7.4 WI layout migration dry-run」「7.6 WI migration apply」の構造を維持したまま、planner 側に **sequential WI 番号 allocator**、port 側に **既存 WI ID 列挙メソッド**を追加する。

## 1. 影響コンポーネント（traceability-model のみ）

| 種別 | コンポーネント | 変更内容 |
|---|---|---|
| Domain Port | `WorkItemMigrationSourcePort` | `listExistingWorkItemIds(): Promise<readonly string[]>` を追加（既存 WI-XXX directory の ID を列挙） |
| Domain VO | `LegacyIssueDirectory` | 不変（H-ID は `legacyId` の文字列で表現される。kind 判別は planner 側の正規表現で実施） |
| Domain Service | `WorkItemMigrationPlanner` | (a) `H\d{2}-\d{2}` パターンを認識、(b) `existingWorkItemIds` + 既マップ済み ISSUE-XXX 番号を `usedNumbers` として保持し、空き番号の若い順に H-ID へ割り当て、(c) `frontmatterPreview` を H-ID 由来の場合 `type: story` + `legacy_id: H{NN}-{NN}` で生成 |
| Application UseCase | `PlanWorkItemMigrationUseCase` | source port から `existingWorkItemIds` を取得し planner に渡す |
| Infrastructure | `FileSystemWorkItemMigrationSourceGateway` | (a) H-ID directory 列挙ロジック追加（`docs/inception/{unit}/H{NN}-{NN}/`、`SKIPPED_INCEPTION_DIRS` 適用継続）、(b) `listExistingWorkItemIds()` 実装（`_cross/WI-XXX/` + `{unit}/WI-XXX/` を walk） |

> Apply 系（`ApplyWorkItemMigrationUseCase` / `FileSystemWorkItemMigrationApplyGateway`）は変更不要。`description.md` 不在時の stub 生成（`# H02-04` 等）と frontmatter 注入は既存ロジックがそのまま流用できる。

## 2. 採番アルゴリズム

```
input:  entries = [LegacyIssueDirectory...]   (混在: WI-XXX / ISSUE-XXX / H{NN}-{NN})
        existingWorkItemIds = ["WI-001", ..., "WI-027"]   (既に占有された番号)

step 1. usedNumbers = parseToInts(existingWorkItemIds)            // {1..27}
step 2. fixed-id pass:                                            // ISSUE-XXX / WI-XXX
          - 各 entry の embedded number を usedNumbers に追加
step 3. sequential-id pass:                                       // H{NN}-{NN}
          for entry in H-ID entries (sorted by sourcePath):
            cursor = 1
            while usedNumbers.has(cursor): cursor++
            assign WI-{cursor.padStart(3, "0")} to entry
            usedNumbers.add(cursor)
```

不変条件:
- `existingWorkItemIds` が空でも、ISSUE-XXX entries が含まれていれば step 2 で usedNumbers が更新される
- 同一 plan 呼び出し内では重複 WI-XXX を発行しない（usedNumbers が共有される）
- ISSUE-XXX → WI-XXX の embedded mapping は変更しない（後方互換）

## 3. ディレクトリ判別ルール（gateway）

| pattern | 列挙対象 | scope | 既存挙動 |
|---|---|---|---|
| `^(?:ISSUE\|WI)-\d+$` | ✅ 列挙 | `cross` or `unit` | 維持 |
| `^H\d{2}-\d{2}$` | ✅ 列挙（**新規**） | `unit` のみ（H-ID は常に unit owned） | 新設 |
| `^_(shared\|operation\|cross)$` | ❌ skip | — | 維持 |
| `^issues$` | ❌ skip | — | 維持（dir そのものが旧 layout） |

`_cross/H{NN}-{NN}/` の物理パスは現状存在しない（57 件すべて `{unit}/H{NN}-{NN}/`）。仮に存在しても skip 対象（`_cross` ディレクトリ自体は SKIPPED に含まれる）。

## 4. frontmatter プレビュー差分

```diff
  ---
  id: <nextId>
- type: issue
+ type: <H-ID なら "story", それ以外は "issue">
  severity: <抽出 or normal>
  status: drafted
- legacy_id: <legacyId>
+ legacy_id: <legacyId>      # ISSUE-XXX / H{NN}-{NN} いずれもそのまま
  affects: [...]              # cross scope のみ
  ---
```

H-ID 由来の場合 `affects` フィールドは付かない（unit scope のため、既存 unit-owned issue 経路と同様）。

## 5. 不変条件（INV）

| INV | 内容 | 検証タイミング |
|---|---|---|
| INV-WI027-1 | H-ID directory に対し常に `WI-` プレフィックス + 3桁 0 詰めの ID が割り当てられる | planner.plan |
| INV-WI027-2 | 同一 plan 内で `nextId` の重複が発生しない | planner.plan（usedNumbers Set） |
| INV-WI027-3 | 既存 WI-XXX directory の番号は新規 H-ID 採番で再利用されない | planner.plan（existingWorkItemIds 必須） |
| INV-WI027-4 | ISSUE-XXX → WI-XXX の embedded mapping に regression がない | 既存 UT-TM-WM01〜02 PASS 維持 |
| INV-WI027-5 | apply 後、H-ID 由来 directory の frontmatter に `legacy_id: H{NN}-{NN}` が記録される | apply gateway（既存 ensureFrontmatter で確認） |

## 6. テスト追加方針（差分のみ）

`docs/product/construction/traceability-model/unit_test_design.md` の `7.4` / `7.5` / `7.6` 系列に H-ID 検出ケースを追記する。詳細は同設計文書を参照。

| 追加ケース ID | 対象 | 概要 |
|---|---|---|
| UT-TM-WM19 | `WorkItemMigrationPlanner#plan` | H-ID entry を sequential WI に割り当てる |
| UT-TM-WM20 | 同上 | `existingWorkItemIds` で占有された番号を skip して採番する |
| UT-TM-WM21 | 同上 | H-ID 由来 candidate の frontmatterPreview に `type: story` + `legacy_id: H{NN}-{NN}` が含まれる |
| UT-TM-WM22 | 同上 | ISSUE-XXX と H-ID が混在しても重複 WI-XXX が発行されない |
| UT-TM-WM23 | `FileSystemWorkItemMigrationSourceGateway#listLegacyIssueDirectories` | `{unit}/H{NN}-{NN}/` directory を unit scope の entry として返す |
| UT-TM-WM24 | `FileSystemWorkItemMigrationSourceGateway#listExistingWorkItemIds` | 既存 `_cross/WI-XXX/` + `{unit}/WI-XXX/` directory の ID を列挙する |

## 7. 参照

- description: [`description.md`](description.md)
- 親 WI: [`../WI-026/description.md`](../WI-026/description.md)
- 残作業計画: [`../../_shared/wi-026-remediation-plan.md`](../../_shared/wi-026-remediation-plan.md) §G2-1 / §G2-2
- Unit logical design: [`../../../product/construction/traceability-model/logical_design.md`](../../../product/construction/traceability-model/logical_design.md)
