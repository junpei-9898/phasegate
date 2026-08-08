---
id: WI-273
type: chore
severity: normal
status: drafted
affects: [docs]
source: internal
---

# WI-273: deny-check.sh の挙動回帰テスト自動化

> 起票日: 2026-07-16
> 起票経緯: `.claude/scripts/deny-check.sh` は WI-253 で git allowlist（default-deny）、WI-269 で `symbolic-ref` の read/write 分離、WI-271 で `config` の read/write 分離を実装したが、挙動の検証は各 WI での手動実証（hook 直接呼び出し）のみだった。WI-272 でテンプレート一致テスト（byte 一致）は入ったが、**挙動そのものの自動回帰が存在しない**。次に allowlist を触る WI のための恒久的な安全網を作る。

## 背景

deny-check.sh は Claude Code の `PreToolUse` hook として stdin から JSON を受け取り、危険なコマンドを exit code 2 でブロックする。ガードの構造は 3 層:

1. `check_symbolic_ref` — `symbolic-ref` の write/delete 形を deny、read 形を allow。
2. `check_git_config` — `config` の write 形（write フラグ・new-style verb・位置引数 2 個以上）を deny、read 形を allow。
3. `check_git_allowlist` — `GIT_ALLOWED_SUBCOMMANDS` にある git サブコマンドのみ allow、それ以外を deny（default-deny）。

加えて `.claude/settings.json` の `permissions.deny` に列挙された非 git deny パターン（`rm -rf *`, `sudo *` 等）を segment 単位で照合する。グローバルフラグ挟み込み（`-C <path>` / `--no-pager` / `-c k=v`）と連鎖演算子（`&&` / `;` / `|` / subshell）越しの隠しセグメントもガードは検査する。

## 作業内容（test-only）

新設: `scripts/harness/__tests__/integration/setup/deny-check-behavior.test.ts`

vitest から `bash` を子プロセスとして直接起動し、PreToolUse JSON を stdin に流して exit code を assert する。カバーするマトリクス:

- git allowlist: 許可サブコマンド代表数件 rc=0 / 非許可（checkout, switch, reset, rebase, merge, cherry-pick, stash, update-ref 等）rc=2。
- グローバルフラグ挟み込み（`-C <path>`, `--no-pager`, `-c k=v`）越しの deny 継続。
- 連鎖演算子（`&&` / `;` / `|`）・subshell 内の隠しセグメント deny。
- `symbolic-ref`: read 形 rc=0 / write・delete 形 rc=2。
- `config`: read 形（`--get` 系 / `--list` / bare key / スコープフラグ併用）rc=0 / write 形（`<key> <value>` / `--unset` / `--add` / `--edit` / new-style verb）rc=2。
- 非 git deny パターン回帰（`rm -rf` 系, `sudo`）。
- 非 Bash ツール・git 以外の通常コマンドが素通り rc=0。

### テスト設計上の決定

1. **live 版のみを対象とする**: テスト対象はリポジトリ内の実ファイル `.claude/scripts/deny-check.sh`（live 版）を直接叩く。配布テンプレート版（`templates/.claude/scripts/deny-check.sh`）は WI-272 のテスト（`deny-check-template-sync.test.ts`）が byte 一致を保証しているため、挙動テストを二重実行しない。テンプレート版の挙動は「live 版と byte 一致」+「live 版の挙動テスト green」の合成で担保される。

2. **`bash` を直接 spawn する**: worktree では `node_modules` が欠落しうるため、テストは `node_modules/.bin` に依存せず `/bin/bash` を直接呼び出す構成にする。deny-check.sh が要求する `jq` はシステムに存在する前提（hook 実行環境と同一）。

3. **deny 対象コマンドは JSON 文字列リテラルとして渡すだけで実行しない**: テストデータとして deny 対象コマンド（`rm -rf`, `sudo`, `git checkout` 等）の文字列が含まれるが、hook に JSON として渡すのみで、テストプロセスがそれらを実行することはない。

## 受け入れ基準

- [x] 新テスト全 green。
- [x] `npx phasegate lint`（L1）PASS。
- [x] `validate --layer L2` PASS。
- [x] 変異検証: allowlist から 1 サブコマンドを一時除去するとテストが RED になることを確認（回帰検知能力の実証）。

## スコープ外

- deny-check.sh 本体の挙動変更（本 WI は test-only の chore）。
- 配布テンプレート版の独立挙動テスト（WI-272 の byte 一致で担保済み）。

## 関連

- WI-253: git 権限を allowlist（default-deny）へ反転。
- WI-269: `symbolic-ref` の read/write 分離ガード。
- WI-271: `config` の read/write 分離ガード。
- WI-272: 配布テンプレート deny-check.sh の byte 一致同期テスト（本 WI が挙動側を補完）。
