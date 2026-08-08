---
id: WI-269
type: fix
severity: high
status: drafted
affects: [docs]
source: internal
---

# WI-269: git allowlist の `symbolic-ref` 抜け穴封鎖

> 起票日: 2026-07-15
> 起票経緯: WI-253 で `.claude/scripts/deny-check.sh` の git サブコマンドを default-deny の allowlist（`GIT_ALLOWED_SUBCOMMANDS`）化した際、`checkout` / `switch` / `reset` 等の HEAD・履歴改変系は意図的に不許可とした。しかし `symbolic-ref` が allowlist に残っており、`git symbolic-ref HEAD refs/heads/<branch>` で **checkout 相当の HEAD 付け替えが可能**な抜け穴になっていた。本日、並列エージェントがこれを実際に使用し main リポジトリの HEAD が意図せず別ブランチへ付け替えられる事象が発生した（オーケストレーターが修復済み）。これは WI-253 の「`git switch` 漏れ」と同型の実証済み抜け穴である。

## 背景

`git symbolic-ref` には読み取り形と書き込み形がある:

- 読み取り: `git symbolic-ref HEAD` / `git symbolic-ref --short HEAD` — 現在の HEAD が指す ref 名を表示するだけで状態は変えない。
- 書き込み: `git symbolic-ref HEAD refs/heads/<branch>`（第 2 引数で対象を指定）/ `git symbolic-ref -d HEAD`（`--delete`）— HEAD の指す先を付け替える。これは `git checkout <branch>`（作業ツリーは変えないが HEAD を移す）に相当し、WI-253 が意図的に不許可とした状態変更操作にあたる。

allowlist は現状サブコマンド名だけで許可/拒否を判定しているため、読み取り・書き込みの区別ができず書き込み形まで通過していた。

これは新機能ではなく、既存の agent 向けコマンド防御の fail-closed 化（security hardening）である。挙動を変えるのは `symbolic-ref` のみとし、他の allowlist 項目・非 git deny ルールは変更しない。

## 本 WI でやること

1. `deny-check.sh` に `symbolic-ref` 専用の引数検査を追加する。読み取り形（`HEAD` / `--short HEAD` など、フラグを除いた位置引数が 1 個以下で `-d`/`--delete` を含まない）のみ許可し、書き込み形（位置引数 2 個以上、または `-d`/`--delete`）は deny する。
2. `symbolic-ref` は `GIT_ALLOWED_SUBCOMMANDS` から外し、専用のガード関数で「読み取り形のみ許可」を判定する（allowlist を素通りさせない）。
3. `docs/guide/hooks-integration.md` の allowlist 節に `symbolic-ref` の読み取り/書き込みの扱いを追記する。
4. hook を直接呼び出して、書き込み形が deny・読み取り形が allow されることを実証する。
5. `.claude/scripts/deny-check.sh` は `phasegate.integrity.json` の pin 対象のため、同一チェンジセットで `integrity:pin` を実行し `integrity:verify` が exit 0 になることを確認する（WI-254 のルール）。

## 受け入れ基準

- [x] `git symbolic-ref HEAD refs/heads/<branch>`（書き込み・元の抜け穴）が拒否される。
- [x] `git symbolic-ref -d HEAD` / `git symbolic-ref --delete HEAD`（HEAD ref 削除）が拒否される。
- [x] `git symbolic-ref HEAD` / `git symbolic-ref --short HEAD`（読み取り）が通過する。
- [x] フラグ挟み込み（`git -C <path> symbolic-ref HEAD refs/heads/x`）でも書き込み形が拒否される。
- [x] `&&` / subshell に隠した書き込み形が segment 分割によって拒否される。
- [x] 既存の allowlist 内コマンド・非 git deny（`rm -rf`, `sudo`）が引き続き期待通り動作する（回帰なし）。
- [x] `phasegate.integrity.json` を re-pin し `integrity:verify` が exit 0。

## 関連

- WI-253: Invert agent git permissions to an allowlist（同型の `git switch` 漏れを閉じた前身）
- WI-254: instruction-file integrity pin（指示ファイル変更は同一チェンジセットで re-pin）
