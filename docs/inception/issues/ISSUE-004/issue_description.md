# ISSUE-004: 他PJ導入時に hooks/scripts/docs が適切にセットアップされない

## ステータス

- **起票日**: 2026-04-17
- **発見契機**: phasegate v0.32 を他PJに `npm install --save-dev` → `npx phasegate init` した際、`.claude/settings.json` に登録されたフックコマンドが指すスクリプトが実体として存在しなかった
- **影響Unit**: agent-integration（hooks）, setup（skill-deployer）, skills（全Sonnet委任系スキル）
- **深刻度**: P0 — Phase Gate / Bash書き込み検出など主要な品質防御機能が他PJで動作しない
- **優先度**: 高 — 他PJ導入が事実上できない状態

## 問題の概要

phasegate は npm パッケージとして他PJに導入し `npx phasegate init` で初期化する設計だが、init で配置される `settings.json` のフックコマンドや、配置されない `scripts/delegate-sonnet.sh`・`docs/folder_management_rules.md` 等が **phasegate 開発リポジトリ内のレイアウトを前提としている**。導入PJの cwd には該当パスが存在しないため、フック・スキル・README手順が機能しない。

phasegate 自身のリポジトリ内では `scripts/harness/...` がそのまま存在するため気付きにくく、テンプレートが「自分自身のリポジトリでも動く」という二重用途で設計されてしまったことが根本原因と思われる。

## 確認された問題（severity 順）

### P0-1. settings.json のフックコマンドが repo-relative パスを参照

**影響**: PreToolUse / PostToolUse / Stop の TS フックが全て silent fail。Phase Gate, Bash書き込み検出, story-reflection 連携などが導入PJで一切働かない。

**根本原因**: `templates/.claude/settings.json:18, 41, 52`

```json
"command": "npx tsx scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts"
"command": "npx tsx scripts/harness/agent-integration/presentation/post-tool-use-hook.ts"
"command": "npx tsx scripts/harness/agent-integration/presentation/stop-hook.ts"
```

`npx tsx` は cwd（=導入PJのルート）を起点にパス解決するが、`scripts/harness/...` は `node_modules/phasegate/scripts/harness/...` にしか存在しない。

**該当TSファイル自体は npm pack に含まれている**（`npm pack --dry-run` で確認済み）ので、コマンドのパス指定だけが誤り。

**修正案**:
- (A) `node_modules/phasegate/scripts/harness/.../pre-tool-use-hook.ts` を直接指定
- (B) `bin/phasegate` に `hook pre-tool-use` 等のサブコマンドを追加し、`npx phasegate hook pre-tool-use` で呼ぶ（推奨。パッケージ移動・renameに強い）

---

### P0-2. `scripts/delegate-sonnet.sh` が package.json `files` から漏れている

**影響**: 12 個のスキル（story-writer, environment-designer, unit-designer, mock-designer, unit-test-designer, scenario-test-logic-designer, implementation-planner, unit-test-logic-designer, scenario-test-designer, it-test-designer, it-test-logic-designer, story-mapper）が Phase 2 で `bash scripts/delegate-sonnet.sh ...` を呼び出す前提だが、導入PJには配置されない。

**根本原因**:
- `package.json:28-41` の `files` 配列に `scripts/delegate-sonnet.sh` が含まれていない（`npm pack --dry-run` で確認）
- スキル本文も repo-relative の `scripts/delegate-sonnet.sh` を指している（`node_modules/phasegate/...` ではない）

**修正案**:
1. `package.json` の `files` に `"scripts/delegate-sonnet.sh"` を追加
2. スキル本文を `bash node_modules/phasegate/scripts/delegate-sonnet.sh ...` か、`npx phasegate delegate-sonnet ...` のような CLI サブコマンド経由に書き換え

---

### P0-3. `docs/folder_management_rules.md` が出荷されていない

**影響**: README Quick Start §3 で `cp node_modules/phasegate/docs/folder_management_rules.md docs/` を案内しているが、ファイルが存在しないためコピー失敗。複数スキル（logical-designer, unit-test-designer 等）も `docs/folder_management_rules.md` を参照前提にしている。

**根本原因**: `package.json:36-38` の `files` には `docs/principles/**` と `docs/guide/**` のみで、`docs/folder_management_rules.md` が無い（`npm pack --dry-run` で確認）。

**修正案**: `files` に `"docs/folder_management_rules.md"` を追加。

---

### P1-4. `init` がスキル参照ドキュメントを自動配置しない

**影響**: README Quick Start §3 の手動 `cp` 手順を踏まないと、スキルが参照する `docs/principles/model-routing.md` `docs/principles/testing-rules.md` `docs/folder_management_rules.md` が導入PJに存在しない。手順忘れで多数のスキルが「参照先なし」状態で動く。

**根本原因**: `scripts/harness/setup/skill-deployer.ts` の `init` フローに docs コピー処理が無い。

**修正案**: `init` 内で `docs/principles/*.md` と `docs/folder_management_rules.md` を導入PJの `docs/principles/` `docs/` にコピーする処理を追加。既存ファイルがあればスキップ。

---

### P1-5. `templates/.husky/pre-commit` が出荷されているが `init` で配置されない

**影響**: Pre-commit hook (`npx tsx scripts/harness/integrations/pre-commit.ts`) が導入PJで動作しない。`files` には含まれている（`templates/**`）が、`deployHookScripts()` は `.husky/` をコピー対象にしていない。

**根本原因**:
- `scripts/harness/setup/skill-deployer.ts:199-246` の `deployHookScripts()` は `templates/.claude/scripts/` と `templates/.claude/settings.json` のみコピー
- しかも仮に配置されても P0-1 と同じく `scripts/harness/integrations/pre-commit.ts` のパスが導入PJに存在しないため動かない

**修正案**: P0-1 のCLI化と併せて、husky テンプレートも `npx phasegate pre-commit` を呼ぶ形に修正したうえで `init` で配置するか、または husky テンプレート自体を廃止して README で別途案内する。

---

### P2-6. `templates/phasegate.config.json` が dead code

**影響**: `init` で生成される `phasegate.config.json` の内容と `templates/phasegate.config.json` の内容が異なる。利用者がテンプレートを参考にすると混乱する。

**根本原因**: `initHarnessConfig()` (`skill-deployer.ts:252-294`) が template ファイルを読まずインラインで構築している。テンプレートは出荷されているが誰も読まない。

**修正案**: `templates/phasegate.config.json` を削除するか、`initHarnessConfig()` をテンプレート読み込み方式に変更する。

---

### P2-7. `hook-config.json` のデフォルト `targetDirs: ["src"]`

**影響**: `src/` を持たないPJでは format/analyze hook が silent no-op になる。挙動として正しいが「動いていない」と気付きにくい。

**根本原因**: `templates/.claude/scripts/hook-config.json:2`

**修正案**: `init` 出力の Next steps で既に案内済み。追加対応するなら、`init` 時に対話的に検出 or プロンプトで設定。Optional。

---

### 観察事項（本ISSUEのスコープ外、別途対応推奨）

- スキル本文が `docs/principles/testing_rules.md`（アンダースコア）を参照しているが実ファイルは `testing-rules.md`（ハイフン）。リンク切れ。

## 検証手順

1. 適当な空プロジェクトで `npm install --save-dev phasegate@0.33.0`
2. `npx phasegate init --name test-project`
3. 以下を確認:
   ```bash
   # P0-1: フックスクリプトが存在しない
   ls scripts/harness/agent-integration/presentation/  # → No such file or directory
   # P0-2: delegate-sonnet.sh が node_modules にも repo-relative にも無い
   ls node_modules/phasegate/scripts/  # → harness/ のみ
   # P0-3: folder_management_rules.md が node_modules に無い
   ls node_modules/phasegate/docs/folder_management_rules.md  # → No such file
   # P1-5: .husky/pre-commit が配置されていない
   ls .husky/  # → No such directory
   ```

## 対処方針（提案）

### Phase A — P0 緊急修正（小さく確実に）

1. `package.json` の `files` に追加: `scripts/delegate-sonnet.sh`, `docs/folder_management_rules.md`
2. `templates/.claude/settings.json` の TS フックコマンドを `node_modules/phasegate/scripts/harness/.../*.ts` に書き換え（暫定対応。CLI化は Phase B）
3. v0.34.0 リリース

### Phase B — CLI サブコマンド化（中期）

4. `bin/phasegate` に以下のサブコマンドを追加:
   - `phasegate hook pre-tool-use` / `post-tool-use` / `stop`
   - `phasegate pre-commit`
   - `phasegate delegate-sonnet`
5. `templates/.claude/settings.json` と `templates/.husky/pre-commit` をサブコマンド呼び出しに変更
6. 12スキルの `scripts/delegate-sonnet.sh` 参照を `npx phasegate delegate-sonnet` に統一

### Phase C — init 機能強化（中期）

7. `init` で `docs/principles/*.md` と `docs/folder_management_rules.md` を自動配置
8. `init` で `.husky/pre-commit` を配置（オプションフラグ `--with-husky`）
9. README Quick Start §3 の手動 `cp` 手順を削除

### Phase D — クリーンアップ

10. `templates/phasegate.config.json` を削除 or `initHarnessConfig()` をテンプレ読込方式に変更
11. スキル本文の `testing_rules.md` → `testing-rules.md` リンク切れ修正

## 関連

- v0.33.0 コミット `282f219` — README 全面改善時に Quick Start §3 の `cp` 手順が追加された（この時点で P0-3 の不整合が顕在化）
- ISSUE-002 — 関連の可能性あり（要確認）
- `templates/.claude/settings.json` — P0-1 の修正対象
- `package.json` `files` — P0-2, P0-3 の修正対象
- `scripts/harness/setup/skill-deployer.ts` — P1-4, P1-5 の修正対象
