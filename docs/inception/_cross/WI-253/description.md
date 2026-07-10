---
id: WI-253
type: task
severity: normal
status: implemented
affects: [docs]
source: internal
---

# WI-253: Invert agent git permissions to an allowlist

> 起票日: 2026-07-10
> 起票経緯: `.claude/scripts/deny-check.sh` と `.claude/settings.json` の permissions が git の危険サブコマンドを列挙式 deny（`git checkout*` / `git reset*` / `git merge*` / `git rebase*` / `git cherry-pick*` / `git revert*` / `git clean*` / `git stash*`）で防いでいたが、`git switch` が deny リストから漏れており、エージェントが正当にそれを発見して「履歴・作業ツリー状態を変更しない」という deny の意図を実質迂回できることが判明した。加えて `git merge*` の過剰なグロブが read-only の `git merge-base` まで誤ってブロックしていた（本 WI 着手時の基点確認コマンドが実際にこれで弾かれた）。

## 背景

列挙式 deny は必ず漏れる。新しい git サブコマンドが増えても deny リストは自動追従しないため、`git switch` のような抜け穴が生まれる。また過剰なプレフィックスグロブは正当な read-only コマンド（`merge-base`）を巻き込む false positive を起こす。

これは新機能の追加ではなく、既存のエージェント向けコマンド防御を「デフォルト拒否 + allowlist」へ反転させることで fail-closed 化する security hardening である。git サブコマンドについてのみ allowlist を採用し、既存の非 git deny ルール（`rm -rf`, `sudo`, Read/Write の鍵ファイルパターン）は変更しない。

## 本 WI でやること

1. `deny-check.sh` に「git はこの allowlist 以外デフォルト拒否」ロジックを追加する（`GIT_ALLOWED_SUBCOMMANDS`）。
2. `git -C <path>` / `git --no-pager` / `git -c key=val` 等グローバルフラグ挟み込みでもサブコマンドを正しく抽出する。
3. `settings.json` から冗長かつ有害になった列挙式 git deny パターンを除去する（allowlist が single source of truth。`git merge*` の false positive も解消）。
4. `switch` / `update-ref` / `reflog expire` / `filter-branch` / `replace` / `merge` 等の履歴・作業ツリー改変系が確実に落ちることをテストで実証する。
5. `docs/guide/hooks-integration.md` に allowlist 方針・許可サブコマンド・追加手順を追記する。

## 受け入れ基準

- [x] allowlist 内コマンド（`git status` / `git --no-pager log` / `git show` / `git diff --cached` / `git add` / `git commit` / `git rev-parse` / `git merge-base` / `git -C <path> status` / `git worktree list` / `git fetch` / `git config --get` / `git push` 等）が通過する。
- [x] `git switch -C x` / `git switch main`（元の漏れ穴）が拒否される。
- [x] `git checkout --` / `git merge` / `git reset` / `git rebase` / `git cherry-pick` / `git revert` / `git stash` / `git clean` が拒否される。
- [x] `git update-ref` / `git reflog expire` / `git filter-branch` / `git replace` / 未知サブコマンドが拒否される。
- [x] `git -C <path> merge` などフラグ挟み込みでもサブコマンドが正しく抽出され拒否される。
- [x] `&&` / `|` / subshell に隠した `git switch` が segment 分割によって拒否される。
- [x] 既存の非 git deny（`rm -rf`, `sudo`）が引き続き拒否される（回帰なし）。
- [x] 拒否メッセージに「allowlist 外の git サブコマンド」であることと、人間が追加できる旨が明示される。
- [x] `settings.json` が valid JSON のままである。

## 関連

- WI-120: L3 security scanner must be hardened for practical secret detection
