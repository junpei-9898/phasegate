---
id: WI-040
type: story
severity: normal
status: tested
legacy_id: H13-04
---

# H13-04: Work-Item trailer validation in pre-commit/CI

@unit ci-governance
@layer inception
@story-id H13-04
@work-item-id WI-026

## 背景

ISSUE-026 Phase Dでは、Quick Modeを含む軽量変更でも `Work-Item: WI-XXX` trailerで変更証跡を残す。D-2でAtomic Commitのメッセージ生成は対応済みだが、CIやhook経路でtrailer欠落を検出できなければ運用上の強制力が弱い。

## 要求

- WI配下のinception documentを変更する場合、コミットメッセージに `Work-Item: WI-XXX` trailerを要求する。
- 通常のpre-commit hookはコミットメッセージ作成前に実行されるため、trailer検証は `commit-msg` hook / CI で実行する。
- CIは `PHASEGATE_COMMIT_MESSAGE`、Huskyは `.husky/commit-msg` から本文ファイルを渡せる。

## 受け入れ基準

- [ ] AC-1: WI配下のstaged fileがあり、commit messageに `Work-Item: WI-XXX` が無い場合に失敗する。
- [ ] AC-2: WI配下のstaged fileがあり、valid trailerがある場合に成功する。
- [ ] AC-3: WI配下以外の変更ではtrailerを要求しない。
- [ ] AC-4: commit message未指定の通常pre-commit挙動は既存通り維持する。
- [ ] AC-5: `.husky/commit-msg` / `templates/.husky/commit-msg` が `phasegate commit-msg "$1"` を呼び出す。
