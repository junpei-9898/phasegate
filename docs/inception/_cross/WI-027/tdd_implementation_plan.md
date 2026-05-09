# TDD実装計画: WI-027

@work-item-id WI-027

## 1. スコープ

**対象 WI**: WI-027（H-ID 形式の旧 work item を `migrate work-items` の対象に拡張）
**親 WI**: WI-026（remediation plan G2-1 / G2-2 を切り出し）
**Unit**: traceability-model のみ
**影響レイヤー**: domain（ports / value-objects / services）+ application（usecases）+ infrastructure（gateways）

### 受け入れ基準（description.md より）
- gateway が `H{NN}-{NN}` directory を `LegacyIssueDirectory` として返す
- port に `listExistingWorkItemIds()` が追加され既存 WI directory の ID を列挙する
- planner が空き番号の若い順に H-ID へ sequential WI-XXX を割り当てる
- H-ID 由来 candidate の frontmatterPreview に `type: story` + `legacy_id: H{NN}-{NN}` が含まれる
- ISSUE-XXX / WI-XXX の embedded mapping に regression がない
- `migrate work-items --dry-run` で 57 件の H-ID が candidates に列挙される
- `migrate work-items --apply` 後、すべての H-ID directory が `WI-XXX` にリネームされる

## 2. 前提条件検証

- `implementation-readiness-checker` 実行: 2026-04-25
  - **判定**: ⚠️ 推奨ファイル欠落あり（story-level `logical_design.md` / `scenario_test_design.md`）→ ユーザー承認のうえ unit-level + WI-027 logical_design 追加で代替
- ✅ `docs/product/construction/traceability-model/logical_design.md`
- ✅ `docs/product/construction/traceability-model/unit_test_design.md`（UT-TM-WM19〜WM24 を追記済み）
- ✅ `docs/product/construction/traceability-model/it_test_design.md`
- ✅ `docs/product/construction/traceability-model/coverage_report.md`
- ✅ `docs/product/environment_contract.md`
- ✅ `docs/inception/_cross/WI-027/description.md`
- ✅ `docs/inception/_cross/WI-027/logical_design.md`（差分仕様）

## 3. TDD実装順序

### 3.1 Domain layer（RED → GREEN → REFACTOR）

| Step | ファイル | 変更内容 | 対応テスト |
|---|---|---|---|
| D1 | `domain/ports/work-item-migration-source-port.ts` | `listExistingWorkItemIds(): Promise<readonly string[]>` を追加 | UT-TM-WM24（gateway 側） |
| D2 | `domain/services/work-item-migration-planner.ts` | (a) `H_ID_PATTERN`, (b) `plan(entries, existingWorkItemIds)` シグネチャ拡張, (c) sequential allocator, (d) frontmatterPreview の `type` 切替 | UT-TM-WM19, WM20, WM21, WM22 |

### 3.2 Application layer

| Step | ファイル | 変更内容 | 対応テスト |
|---|---|---|---|
| A1 | `application/usecases/plan-work-item-migration-usecase.ts` | source port から `listExistingWorkItemIds()` を取得し planner に渡す | 既存 UT-TM-WM05 を更新（modify in-place）|

### 3.3 Infrastructure layer

| Step | ファイル | 変更内容 | 対応テスト |
|---|---|---|---|
| I1 | `infrastructure/gateways/file-system-work-item-migration-source-gateway.ts` | (a) H-ID directory 列挙ロジック追加, (b) `listExistingWorkItemIds()` 実装 | UT-TM-WM23, WM24 |

### 3.4 ITテスト / E2E

ITテスト: 既存 `MigrateWorkItemsCommandHandler` の test に H-ID 検出 + sequential allocate のシナリオを 1 ケース追加（apply はリアル file system を `mkdtemp` で構築する既存 pattern を流用）。

実 file system 上の 57 件 H-ID directory への migrate は **手動検証フェーズ**（Phase 2 末尾）で実施。`--dry-run` で candidates 数を確認し、`--apply` で実マイグレーションを実行。

## 4. 環境検証チェックリスト

- [ ] `npm test -- --run` が PASS（既存 3438 ケース）
- [ ] `npx phasegate lint` が PASS（L1）
- [ ] `npx tsx scripts/harness/main.ts validate --layer L2 --format human` が PASS
- [ ] `npx tsx scripts/harness/main.ts migrate work-items --dry-run` が H-ID candidates を出力
- [ ] `npx tsx scripts/harness/main.ts migrate work-items --apply` が成功
- [ ] apply 後、`find docs/inception -type d -regex '.*/H[0-9][0-9]-[0-9][0-9]'` が空
- [ ] apply 後、`grep -rn "legacy_id: H" docs/inception/` で全 H-ID が legacy_id に保存されている

## 5. QA（不明点・確認事項）

### [Question] Q1: H-ID directory の sort 順は sourcePath 昇順で確定して良いか？

planner の sequential 採番は entries の渡される順に依存する。`FileSystemWorkItemMigrationSourceGateway` は既に `(await readdir(...)).sort()` を使用しており、`docs/inception/{unit}/H{NN}-{NN}/` を unit 名 → H-ID 名でソートする見込み。

unit 名の sort 順:
- agent-integration → ci-governance → harness-api → harness-error → nyquist-validation → phase-dependency-model → quick-mode → regression-suite → skill-quality → traceability-model → validator-system

H-ID の sort 順（同一 unit 内）:
- 文字列 sort（`H02-04` < `H02-05` < `H03-02` ...）

これに従うと、当初の一括移行では最初の H-ID = `agent-integration/H11-01` が `WI-028` を取る。

> 追記: 後続の `_cross/WI-028..WI-036` 起票と番号衝突したため、該当する unit-scoped WI は `WI-097..WI-105` に再採番済み。以後は WI ID を repo 全体で一意に扱う。

**推奨案:** sourcePath 昇順（unit 名 → H-ID 名）。明示的な番号予約や stable mapping を求めない（一括バッチ移行のため最終的な物理 directory 名は重要だが、各 H-ID がどの WI に化けるかの強い制約は無い）。

[Answer] Sourcepath昇順で問題ありません。

---

### [Question] Q2: 既存テスト UT-TM-WM01〜WM07 の `plan(entries)` シグネチャ変更影響

現状 `plan(entries: readonly LegacyIssueDirectory[])` を `plan(entries, existingWorkItemIds)` に拡張する。既存テストは引数を 1 つしか渡していないため、後方互換のため `existingWorkItemIds` を optional + default `[]` にする方針。

**推奨案:** `plan(entries, existingWorkItemIds: readonly string[] = [])` で既存テストの修正不要にする。`PlanWorkItemMigrationUseCase` 側は新たに port から取得した値を必ず渡すため、本番経路は影響を受けない。

[Answer] そのとおりで進めてください。

---

### [Question] Q3: H-ID directory 内の既存ファイル（logical_design.md など）の取り扱い

`apply` 時、directory rename は中身ごと移動するため `logical_design.md` 等は維持される。一方、frontmatter は `description.md` に対してのみ注入される（既存ロジック）。

description.md が無い 44 件の directory に対しては、apply gateway が `# H02-04\n` の stub を生成し frontmatter 注入する（既存ロジック流用）。

**推奨案:** 既存ロジックそのままで OK。stub description.md には `# {legacyId}` のみ生成する。

[Answer] OKです。

## 6. 前提条件・リスク

### リスク
- **R1**: 57 件の rename 一括実行による git 履歴の rename detection 失敗 → `git mv` ではなく `fs.rename` を使うため、git は別ファイルと認識する可能性。**緩和**: コミットメッセージに対応表を含める。
- **R2**: `existingWorkItemIds` 取得タイミングと plan 評価のレース → `--apply` は単発実行なので並行性は問題にならない。**緩和**: 不要。
- **R3**: H-ID 直下に `description.md` が無く、別の md 名（`tdd_implementation_plan.md` 等）が `descriptionFileName === null` 経路に流れる → 既存 stub 生成ロジックが `# H02-04` を書くだけなので問題なし。
- **R4**: `_cross/` 配下に H-ID directory が将来作られた場合、現状は skip 対象。本 WI のスコープ外（`SKIPPED_INCEPTION_DIRS` の運用方針は別途検討）。

### 前提
- 残作業計画 G1（`_cross/WI-XXX/` 編集 dead-lock 解消）は v0.103.0 で完了済み
- 残作業計画 G2-3〜G2-5 / G3 / G4 は v0.104.0 で完了済み
- WI-026 は description.md `status: drafted` の状態で待機中。本 WI 完了後に WI-026 側 AC を更新

## 7. Phase 2 完了条件

- 全 unit / IT テスト追加 PASS
- `migrate work-items --dry-run` で `candidates: 57` を確認
- `migrate work-items --apply` 実行で全 H-ID が WI に置換
- 既存 3438 + 新規ケース 全 PASS
- `npx phasegate lint` PASS
- L2 / L3 validator PASS
