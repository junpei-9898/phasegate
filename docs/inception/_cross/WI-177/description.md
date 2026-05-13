---
id: WI-177
type: story
severity: normal
status: tested
affects: [setup, installation, agent-integration, skill-quality, documentation, harness-api]
source: internal
---

# WI-177: Claude Code Post-Readiness Workflow and Recovery Guidance

> 起票日: 2026-05-13
> 起票経緯: `phasegate@0.154.0` の WI-176 dogfood で、`plan.agentReadiness` により Claude / Codex / shared の setup 状態は明確になった。一方で、Claude Code が readiness 確認後に WI 起票、計画、product reflection、実装前検証へ自然に進む導線と、権限エラー時に「環境問題か PhaseGate 問題か」を迷わず説明する recovery guidance には改善余地が残った。

## P4 との関係

`docs/inception/_shared/wi_152_174_prioritization_plan.md` の P4 は、主に WI-156 の drift guardrails と WI-170 の initial creation public contract 判断を扱う。

本 WI は P4 の guardrail 実装そのものではなく、P3/WI-171〜WI-176 で整備した agent-driven setup の体験改善 follow-up である。関係は「P4 後の運用品質改善として隣接」だが、スコープは Claude Code の実作業導線と recovery guidance なので新規起票する。

## 問題

### 1. readiness 後の次アクションが setup に寄っている

`CLAUDE.md` は `setup:agent --agent claude --dry-run --json` と `plan.agentReadiness` の読み方を案内できるようになった。しかし、readiness が `configured` になった後に Claude Code が次に行うべき WI 起票、計画、product reflection、検証準備の順序はまだ薄い。

### 2. 権限エラー時の説明が agent にとって十分か未確定

`setup:agent --apply --json` は `.claude/settings.json` / `.codex/hooks.json` の `EPERM` / `EEXIST` を structured error として返せる。ただし、Claude Code がその出力から「PhaseGate の実装不具合ではなく sandbox / filesystem / existing path の問題」と判断し、ユーザーへ適切に依頼できるかはさらに明確化できる。

### 3. managed context / skills / public docs の役割分担がまだ荒い

readiness の説明は `CLAUDE.md` に入ったが、詳細 recovery を `CLAUDE.md` に持たせるか、`phasegate-config-doctor` / `phasegate-toolkit-guide` に委譲するか、public troubleshooting に置くかの境界を整理したい。

## スコープ

### Phase 1: Claude Code post-readiness workflow

- `CLAUDE.md` managed section に、readiness configured 後の最短 action chain を追加する。
- action chain は WI 起票 / 計画 / product reflection 確認 / validation / commit 前確認へつながる。
- 既存 user-owned section を壊さず、managed section のみ更新する。

### Phase 2: Permission and filesystem recovery guidance

- `setup:agent` structured error の `likelyCause` / `recovery` が Claude Code から説明しやすい粒度か見直す。
- `.claude` が file として存在する、`.codex` 作成が sandbox で拒否される、managed target hash mismatch などの代表ケースを guide / skills で説明する。
- 必要なら CLI の recovery 文言を改善する。

### Phase 3: Skill and documentation routing

- `phasegate-config-doctor` は structured error と `doctor --json` から次アクションを説明できるようにする。
- `phasegate-toolkit-guide` は readiness 後の workflow を案内できるようにする。
- `docs/guide/troubleshooting.md` と `docs/guide/getting-started.md` のどちらに置くべき内容か整理する。

### Phase 4: Registry dogfood

- publish 後に fresh project で Claude-only setup を実施する。
- Claude readiness configured 後に、managed `CLAUDE.md` だけで次の WI 起票・計画準備へ進めるかを確認する。
- 失敗系として `.claude` file conflict または sandbox permission error を再現し、説明可能性を確認する。

## 受け入れ基準

- [ ] `CLAUDE.md` generated managed section が readiness configured 後の next workflow を明示する。
- [ ] Claude Code が `plan.agentReadiness` configured 後に、WI 起票、計画、product reflection、検証準備へ進むための最短 command / document route を説明できる。
- [ ] `.claude/settings.json` / `.codex/hooks.json` 作成失敗時の structured error または docs / skills が、環境権限・既存 path conflict・PhaseGate managed target の違いを説明できる。
- [ ] `phasegate-config-doctor` または `phasegate-toolkit-guide` が Claude Code setup recovery の参照先として機能する。
- [ ] `docs/guide/troubleshooting.md` または `docs/guide/getting-started.md` に、Claude Code readiness 後の行動と recovery が反映される。
- [ ] 既存 `CLAUDE.md` user-owned content を保持した reconcile / uninstall safety が確認される。
- [ ] registry dogfood で Claude-only setup、readiness 後 workflow、代表的 recovery の説明を確認する。

## 非スコープ

- Claude Code 本体の外部 API / GUI 操作の自動化
- hosted CI 実行結果の remote API 取得
- Codex native `apply_patch` の pre-edit interception
- P4/WI-156 の drift guardrail 実装
- P4/WI-170 の initial creation public contract 判断

## 関連 WI

- WI-156: drift guardrails (P4)
- WI-170: initial creation public contract decision (P4)
- WI-171: first-time user onboarding
- WI-172: agent-driven setup orchestrator
- WI-173: agent configuration change workflow
- WI-174: agent context files as managed setup targets
- WI-175: setup completeness and confidence
- WI-176: Claude Code dogfood readiness
