---
id: WI-141
type: issue
severity: high
status: drafted
affects: [agent-integration, ci-governance, harness-api, validator-system]
source: internal
---

# WI-141: Commit bypass must be audited across agent hooks, Git hooks, and CI

> 起票日: 2026-05-10
> 起票経緯: WI-140 実装時に `git commit --no-verify` で pre-commit hook を bypass した。後続確認で full test / targeted L2 は green だったが、bypass 前に hook failure の残存項目を十分に分類・証跡化していなかった。Codex 固有の運用注意ではなく、Claude Code hooks / Git hooks / CI でも同じ policy が効く PhaseGate の共通機構として扱う。

## 背景

`--no-verify` は Git hook 自体を飛ばすため、Codex / Claude Code の agent hook だけでは完全には防げない。

一方で、既存 backlog や phase-gate false positive によって pre-commit が止まる状況では、緊急対応や既存既知 block の回避として bypass が必要になる場合もある。問題は bypass の可否を人間・agent の即時判断だけに委ねると、以下が残ること。

- 本来修正すべき metadata / test-quality / status-staleness を見落として進める。
- 何を bypass したのか commit / push / CI 後に追跡できない。
- Codex と Claude Code で hook policy が分岐し、片方だけが安全になる。
- ローカルでは bypass できても、push / CI で止める最終防衛線が弱い。

## 本 WI でやること

1. `--no-verify` 相当の bypass を audit 対象として扱う共通 policy を定義する。
2. bypass commit には structured trailer を必須化する。
   - `Bypass-Reason`
   - `Bypass-Evidence`
   - `Bypass-Owner`
   - 必要に応じて `Bypass-Report`
3. bypass 可能 / 不可の blocker 分類を contract 化する。
   - 原則 bypass 不可: metadata, test-quality, status-staleness
   - 条件付き bypass 可: 既存既知の phase-gate / environment / false positive
4. pre-commit / commit-msg / pre-push / CI で同じ policy を呼べる harness-api command を設計する。
5. Codex hooks と Claude Code hooks は同じ PhaseGate command を呼ぶだけにし、agent 別に policy を複製しない。
6. bypass 時の gate result を structured report として保存し、commit trailer から参照できるようにする。
7. README / guide / product docs に、bypass audit の運用手順と禁止条件を反映する。

## 受け入れ基準

- [ ] `git commit --no-verify` 相当で進めた commit を、push または CI で audit できる。
- [ ] bypass trailer が無い bypass commit を検出できる。
- [ ] bypass 不可 blocker（metadata / test-quality / status-staleness など）が残っている場合は fail できる。
- [ ] Codex hook と Claude Code hook が同じ PhaseGate bypass policy を参照する設計になっている。
- [ ] `Bypass-Evidence` に指定された検証コマンドまたは report を機械的に確認できる。
- [ ] 既存既知 blocker を bypass する場合でも、残存 blocker と理由が commit / report に残る。

## 非スコープ

- WI-140 の status derivation gate 本体の再設計。
- 個別の既存 backlog WI の status 修正。
- Codex / Claude Code 片方だけに閉じた hook 改修。

## 関連

- WI-140: Work item status derivation must become a CI-enforced green evidence gate
- WI-126: Work item status must be derived and updated by PhaseGate
- `scripts/harness/agent-integration/`
- `scripts/harness/ci-governance/`
- `scripts/harness/harness-api/`
- `scripts/harness/validator-system/`
