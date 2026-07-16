# WI-264 Logical Design — reconcile orphan skill prune

<!-- @work-item-id WI-264 -->

## Overview

`RunReconcileUseCase.execute` に **orphan skill prune** ステップを追加する。既存の skill 再デプロイ計画（`planSharedSkills` / `planPersonalSkills`）を作った後、manifest に記録されたスキルエントリのうち現行バンドルカタログ（`getBundledSkillsForSet("all")`）に含まれない skill 名を検出し、prune plan item（action=`prune`）を生成する。`--apply` 時に on-disk ディレクトリを削除し manifest エントリを除去する。dry-run では報告のみ。

変更は installation unit の **application 層（`run-reconcile.ts`）と presentation 層（`reconcile-handler.ts` の action 表示）に限定**。domain（`DeploymentManifest.removeEntry` は既存）・infrastructure は無変更。

## Layers

- **domain**: 変更なし。`DeploymentManifest.removeEntry(path)` を再利用。
- **application（`run-reconcile.ts`）**:
  - `ReconcileAction` union に `"prune"` を追加。
  - `planOrphanSkills(input, manifest)` を追加: manifest エントリから orphan skill を検出し、per-skill の outcome（plan item + apply クロージャ）を返す。
  - `execute` の skill 再デプロイ計画後に `planOrphanSkills` を呼び、outcome を `outcomes` / `plan` に追加する。
  - apply ループで prune outcome の `apply()`（ディレクトリ削除）を実行し、`nextManifest = nextManifest.removeEntry(path)` で manifest から除去する。既存 apply ループは `hashContent !== null` の時に addEntry するが、prune は「hashContent を返さず manifest から remove する」別経路として扱う（後述の設計注記）。
- **presentation（`reconcile-handler.ts`）**: 既存の plan 行フォーマットは `item.action` をそのまま表示するため、`"prune"` は自動的に `- <path>: prune (...)` として出力される。追加変更は最小（action union 拡張の型追従のみ、実質コード変更なし）。

## Orphan 検出ロジック

```
allowed = new Set(getBundledSkillsForSet("all"))
for each manifest entry e where e.mode === "created":
  parse e.path against skill prefixes:
    "skills/<name>"          → root = "skills",        name
    ".claude/skills/<name>"  → root = ".claude/skills", name
    ".codex/skills/<name>"   → root = ".codex/skills",  name
  skip if name === ".harness-version"   (INV-P2)
  skip if name contains "/"             (only direct children are skill dirs)
  if name not in allowed:               (INV-P3)
    → orphan: plan prune of e.path
```

`skills/` prefix の判定では、`skills/.harness-version` を除外し、`skills/<name>/...` のようなネストは skill 名抽出時に直下ディレクトリのみを対象とする（manifest は skill を直下ディレクトリ単位で記録するため、`skills/<name>` に完全一致するエントリのみが候補）。

## Prune plan item / apply

- plan item: `action="prune"`, `repairMode="mechanical"`, `strategy="copy-dir"`, `changed=true`, `summary="<path>: prune orphan skill (not in current bundle)"`, `diff="- skill directory"`, `skillHint=null`。
- `needsBackup=false`（INV-P4 注記: 対象は phasegate 自身が過去にデプロイし manifest に記録した skill 本体であり backup 不要。既存 uninstall の created-directory 削除と同方針）。
- `apply()`: `rm(resolveProjectPath(root, e.path), { recursive: true, force: true })`。返り値で「manifest から除去すべき path」を呼び出し側に伝える。

## apply ループの拡張（設計注記）

既存 apply ループは各 outcome について `apply()` が返す hashContent が非 null なら `addEntry`。prune outcome はこの経路に乗せず、**専用フラグ `prune: true` と `path`** を outcome に持たせ、ループ内で:

```
if (outcome.prune) { await outcome.apply(); nextManifest = nextManifest.removeEntry(outcome.item.path); changed.push(item); continue; }
```

これにより prune は「ディスク削除 + manifest から除去」を atomically に処理する（INV-P4）。既存の add/update/link 経路には影響しない。

`if (changed.length > 0 || manifest.version !== input.phasegateVersion)` の manifest save 条件は既存のまま — prune は `changed` に積まれるため save が発火する。

## dry-run / idempotency

- dry-run（`input.apply === false`）: 既存契約どおり apply ループに入らず plan のみ返す。ディスク・manifest 不変。
- idempotency: 1 回目の apply で orphan の manifest エントリが除去されるため、2 回目の reconcile では orphan 候補が存在せず prune plan item は 0 件。

## Safety（INV との対応）

- INV-P1（manifest-scoped）: orphan 判定の起点は `manifest.entries` のみ。ディスク走査でユーザースキルを拾わない。
- INV-P2（metadata 保護）: `.harness-version` を名前抽出時に除外。
- INV-P5（root scope）: `resolveProjectPath` のエスケープ検査を通す。

## 影響範囲

- `run-reconcile.ts`（application）— `ReconcileAction` 拡張 + `planOrphanSkills` 追加 + apply ループ拡張。
- `reconcile-handler.ts`（presentation）— 型追従のみ（表示は既存フォーマットで対応）。
- `reconcile-handler.test.ts`（IT）— prune ケース追加。
- product docs（installation logical_design.md / domain_model.md）— prune 契約反映。
- CHANGELOG — prune 機能記載 + WI-256 defer 文言解消。
- 他 Unit / uninstall / install / doctor への波及なし（reconcile 経路に閉じる）。
