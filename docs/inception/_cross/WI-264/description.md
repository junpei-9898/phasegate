---
id: WI-264
type: story
severity: normal
status: tested
affects: [installation]
---

# WI-264: reconcile による廃止バンドルスキルの prune 機能

<!-- @work-item-id WI-264 -->

> 起票日: 2026-07-15
> 経緯: WI-256 でスキルカタログが 30→29 に再編され、`implementation-planner` / `doc-freshness-checker` / `pointer-validator` の 3 スキルがバンドルから削除された。しかし `reconcile` はバンドルを離脱したスキルを consumer 側で prune しないため、導入済みプロジェクトに orphan スキルディレクトリ（および manifest エントリ）が残置される。CHANGELOG（Unreleased / WI-256 節）に「A permanent `reconcile`-based prune is deferred to a follow-up WI.」と明示 defer されている。本 WI がその follow-up。

## Context

`reconcile` は現在、現行バンドルカタログ（`getBundledSkillsForSet("all")`）に含まれるスキルを再デプロイ・追従するのみで、**バンドルから離脱したのに manifest には残っているスキル**を検出・削除しない。結果:

- shared install: `skills/implementation-planner` 等が manifest エントリ + on-disk ディレクトリとして残置される。
- personal install: `.claude/skills/<orphan>` / `.codex/skills/<orphan>` が同様に残置される。

これは L4 の doc-health / consistency に混乱を生み（存在しないスキルへの参照）、manifest の真実性を損なう。

## スコープ（本 WI で landed）

`reconcile` 実行時に、**manifest で管理されているスキルエントリ**（shared: `skills/<name>`、personal: `.claude/skills/<name>` / `.codex/skills/<name>`、いずれも mode=`created`）のうち **現行バンドルカタログ（`getBundledSkillsForSet("all")`）に存在しない skill 名**を orphan と判定し prune する:

1. on-disk のスキルディレクトリを削除する。
2. manifest から該当エントリを除去する。
3. 各 prune を plan item（action=`prune`）として報告する。dry-run 時はディスク・manifest を変更しない。

### 安全側の設計（不可侵ルール）

- **manifest 外のユーザー独自スキルは絶対に削除しない**。prune 対象は manifest に `created` エントリとして記録されているスキルのみ。既存の uninstall が「manifest-managed skill directories にスコープ」する流儀と一致させる。
- `.harness-version` は prune 対象外（現行バンドルの版管理メタデータ）。
- prune はディレクトリ削除を伴うが、対象は「以前 phasegate 自身がデプロイし manifest に記録した」ものに限られるため backup 不要（uninstall の `planCreatedDirectory` / 個別 skill 削除と同方針）。dry-run で事前確認できる。
- shared install / personal install の双方で機能する。

## スコープ外

- 新 CLI コマンドの追加（`reconcile --apply` / `--dry-run` で機能する。`update-skills` alias もそのまま prune を通す）。
- バンドル外スキルの「保持オプション」フラグ（不要 — orphan は常に prune する）。
- L4 validator ID としての `doc-freshness-checker` / `pointer-validator`（別概念。skills/ 配下のみが対象）。
- 手動削除手順の CHANGELOG からの削除（本 WI 完了に伴い prune 手順を追記し、defer 文言を解消する）。

## Acceptance Criteria

- [x] shared install で manifest に残った orphan skill（例: `skills/implementation-planner`）が `reconcile --apply` で on-disk ディレクトリ・manifest エントリともに prune される。
- [x] personal install で `.codex/skills/<orphan>` が同様に prune される。
- [x] manifest 外のユーザー独自スキル（例: `skills/user-owned` / `.codex/skills/user-owned`）は prune されず残存する。
- [x] `.harness-version` は prune されない。
- [x] dry-run では prune plan item が報告されるがディスク・manifest は変更されない。
- [x] orphan が無い正常な reconcile は従来どおり no-op（prune plan item 0 件）。
- [x] `reconcile-handler.test.ts` に上記ケースを追加、全 green。
- [x] `npx phasegate lint` 0 violations / `validate --layer L2` PASS。
- [x] installation unit product docs（logical_design.md / domain_model.md）に prune 契約を反映（@work-item-id WI-264）。
- [x] CHANGELOG に prune 機能を記載し、WI-256 節の defer 文言を解消する。

## 検証

- installation 関連テスト green。
- `npx phasegate lint` 0 violations。
- `npx tsx scripts/harness/main.ts validate --layer L2` PASS。
- sandbox ディレクトリでの実挙動確認（orphan が消え、manifest 外スキルが残ること）。
