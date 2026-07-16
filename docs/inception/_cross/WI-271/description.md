---
id: WI-271
type: fix
severity: high
status: tested
affects: [docs]
source: internal
---

# WI-271: git allowlist の `config` 書き込みフォーム封鎖

> 起票日: 2026-07-15
> 起票経緯: WI-269（`symbolic-ref` の read/write 分離）の allowlist 再監査で、`config` が read/write 両義のまま `GIT_ALLOWED_SUBCOMMANDS` に残っていることが指摘された。`git config core.hooksPath <path>` で hook 経路そのものを書き換えられるため、**L0 防御全体（deny-check.sh 自身を含む）を無効化できる**。症状としては symbolic-ref（HEAD 付け替え）より重い。

## 背景

`git config` には読み取り形と書き込み形がある:

- 読み取り: `--get` / `--get-all` / `--get-regexp` / `--get-urlmatch` / `--list` / `-l`、および `git config <key>`（位置引数 1 個での値読み出し）。スコープフラグ併用の読み取り（`--global --list` 等）も正当。
- 書き込み: `git config <key> <value>`（位置引数 2 個）、`--unset` / `--unset-all` / `--add` / `--replace-all` / `--edit` / `-e` / `--remove-section` / `--rename-section`、および new-style verb（`git config set|unset|edit|rename-section|remove-section`、git >= 2.46）。

allowlist はサブコマンド名だけで許可/拒否を判定するため、読み書きの区別ができず書き込み形まで通過していた。これは新機能ではなく、WI-253 / WI-269 と同系列の agent 向けコマンド防御の fail-closed 化（security hardening）である。挙動を変えるのは `config` のみとし、他の allowlist 項目・非 git deny ルールは変更しない。

## 本 WI でやること

1. `deny-check.sh` に `check_symbolic_ref` と同じ流儀の `check_git_config` ガードを追加する。読み取り形のみ許可し、書き込み形（write フラグ、write verb、または位置引数 2 個以上）は deny する。判定に迷う形は fail-closed 側に倒す（例: new-style `git config get <key>` は位置引数 2 個として deny — フラグ形 `--get` を使う）。
2. `config` を `GIT_ALLOWED_SUBCOMMANDS` から外し、`check_git_allowlist` に委譲 early-return を追加する（symbolic-ref と同じパターン）。
3. `docs/guide/hooks-integration.md` の read/write 分離節に `config` を追記する。
4. hook を直接呼び出して deny/allow を実証する（write 23 ケース deny、read 16 ケース allow、回帰 12 ケース）。
5. `.claude/scripts/deny-check.sh` は `phasegate.integrity.json` の pin 対象のため、同一コミットで `integrity:pin` を実行し `integrity:verify` が exit 0 になることを確認する（WI-254 のルール）。

## 受け入れ基準

- [x] `git config core.hooksPath /tmp/x`（hook 経路書き換え・本 WI の動機）が拒否される（rc=2）。
- [x] `git config <key> <value>` の 2 位置引数書き込みが、スコープフラグ（`--global` / `--local`）併用でも拒否される。
- [x] `--unset` / `--unset-all` / `--add` / `--replace-all` / `--edit` / `-e` / `--remove-section` / `--rename-section` が拒否される。
- [x] new-style verb（`set` / `unset` / `edit` / `rename-section` / `remove-section`）が拒否される。
- [x] フラグ挟み込み（`git -C <path> config <key> <value>`）・チェーン隠し（`&&` / `;`）でも書き込み形が拒否される。
- [x] `git config --list` / `-l` / `--get <key>` / `--get-all` / `--get-regexp` / `git config <key>` が通過する（rc=0）。
- [x] read 形 + スコープフラグ（`--global --list`、`--local --get <key>` 等）が通過する。
- [x] 既存の allowlist 内コマンド・symbolic-ref の read/write 分離・非 git deny（`rm -rf`, `sudo`）が引き続き期待通り動作する（回帰なし）。
- [x] `phasegate.integrity.json` を re-pin し `integrity:verify` が exit 0。

## 関連

- WI-253: Invert agent git permissions to an allowlist（default-deny の導入）
- WI-269: `symbolic-ref` の read/write 分離ガード（本 WI が倣ったパターン）
- WI-254: instruction-file integrity pin（指示ファイル変更は同一チェンジセットで re-pin）
- WI-272: 配布テンプレート deny-check.sh の allowlist 同期（後続）
