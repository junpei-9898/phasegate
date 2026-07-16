# WI-264 Domain Model — reconcile orphan skill prune

<!-- @work-item-id WI-264 -->

本 WI は新規ドメイン値オブジェクトを追加しない。既存の `DeploymentManifest` / `DeploymentEntry`（installation domain）の不変条件の上に、application 層（`RunReconcileUseCase`）の pruning 契約を定義する。

## 関与する既存ドメインモデル

### DeploymentManifest（既存・不変）
- `entries: readonly DeploymentEntry[]`（path 一意）。
- `removeEntry(path): DeploymentManifest` — 既存の純関数（immutable copy）。本 WI の prune はこれを利用する。domain 側の追加変更は不要。

### DeploymentEntry（既存・不変）
- `path` / `mode`（`created | merged | symlink`）/ `hash` / `deployedAt`。
- phasegate がデプロイしたスキルは常に `mode="created"` の `skills/<name>` / `.claude/skills/<name>` / `.codex/skills/<name>` として記録される（既存契約）。

## Prune の判定ルール（application 層の不変条件）

orphan skill = **manifest に `created` エントリとして記録されているスキル**であって、**現行バンドルカタログ（`getBundledSkillsForSet("all")`）に skill 名が存在しない**もの。

- **INV-P1（manifest-scoped）**: prune 対象は manifest に記録された skill エントリのみ。manifest に無いディスク上のディレクトリ（ユーザー独自スキル）は決して削除しない。これは既存 uninstall の「manifest-managed skill directories にスコープ」原則の踏襲。
- **INV-P2（metadata 保護）**: `.harness-version`（`skills/.harness-version` / `<agent>/.harness-version`）は prune 対象外。skill 名として扱わない。
- **INV-P3（catalog 差分）**: 判定基準は「現行バンドルにその skill 名が無いこと」。version 差ではなく **skill 集合の差分**。
- **INV-P4（atomicity）**: 1 skill の prune は「on-disk ディレクトリ削除」と「manifest エントリ除去」を対で行う。dry-run では両方とも行わない（報告のみ）。
- **INV-P5（root scope）**: 対象パスは常に project root 配下（`skills/` / `.claude/skills/` / `.codex/skills/` prefix）。既存の `resolveProjectPath` によるエスケープ検査を経る。

## prune 対象パスの分類

| manifest entry path | 種別 | skill 名 | prune 対象か |
|---|---|---|---|
| `skills/implementation-planner` | shared | implementation-planner | ✅（現行カタログ外なら） |
| `skills/codebase-mapper` | shared | codebase-mapper | ❌（現行カタログ内） |
| `skills/.harness-version` | shared meta | —（INV-P2） | ❌ |
| `.codex/skills/pointer-validator` | personal | pointer-validator | ✅（現行カタログ外なら） |
| `.claude/skills/.harness-version` | personal meta | —（INV-P2） | ❌ |
| ディスク上 `skills/user-owned`（manifest 無し） | user-owned | —（INV-P1） | ❌ |
