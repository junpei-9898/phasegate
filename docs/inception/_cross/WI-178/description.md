---
id: WI-178
type: story
severity: normal
status: tested
affects: [installation, documentation]
source: internal
---

# WI-178: Agent-Scoped Doctor Readiness For Claude-Only Setup

> 起票日: 2026-05-13
> 起票経緯: `phasegate@0.155.0` の WI-177 dogfood で、Claude-only `setup:agent --agent claude --intent strict --with-husky --apply --json` は `claude` / `shared` readiness を `configured` として正しく示した。一方で、その直後の `doctor --json` は Codex 未導入 (`.codex/hooks.json`, `.codex/skills`) を red finding として返し、Claude-only 利用者や agent には「Claude は configured なのに doctor は失敗している」と見える余地が残った。

## 問題

### 1. `doctor` が selected agent の文脈を持たない

`setup:agent --agent claude` は Codex を `not-applicable` として扱えるが、`doctor --json` は現状の full install 前提で Codex 欠落を red にする。Claude-only setup の成功確認として `doctor` を案内すると、agent が unnecessary repair を提案しやすい。

### 2. setup readiness と doctor overallStatus の意味が混同されやすい

WI-175/WI-176/WI-177 で `plan.completeness` と `plan.agentReadiness` は明確になったが、`doctor` の red は「選択した agent readiness が未完了」なのか「未選択 agent も含む full install が未完了」なのかを表現していない。

### 3. guidance が暫定的に `phasegate:check-ready` / L2 validate へ逃げている

WI-177 dogfood では Claude-only setup 後に `phasegate:check-ready` と `validate --layer L2` は pass した。これは実用上の回避策になるが、`doctor` 自体の説明力を上げたほうが agent と user の判断負荷は下がる。

## スコープ

### Phase 1: Agent-scoped doctor planning

- `doctor` に agent scope を導入するか、`setup:agent` 側の validation guidance から full-scope doctor を外すかを設計する。
- 候補:
  - `phasegate doctor --agent claude --json`
  - `phasegate doctor --scope selected-agent --json`
  - `setup:agent --agent claude` の validation では `doctor` を optional/full-install diagnostic として説明する
- どの案でも、Claude-only setup で Codex 欠落を「Claude readiness failure」として扱わない。

### Phase 2: Finding severity / applicability

- Codex 未選択時の `codex-hook-missing` / `codex-skills-symlink` を `not-applicable` または scoped warning として表現できるか検討する。
- JSON contract は agent が `overallStatus`, finding severity, applicability/scope を区別できる形にする。
- 既存 full install / both-agent doctor の red behavior は壊さない。

### Phase 3: Guidance and skills

- `phasegate-toolkit-guide` と `phasegate-config-doctor` が、Claude-only setup 後の `doctor` red を full-scope diagnostic と説明できるようにする。
- `docs/guide/troubleshooting.md` に、Claude-only readiness の確認方法と full doctor との違いを追記する。

### Phase 4: Registry dogfood

- publish 後 fresh project で `setup:agent --agent claude --apply --json` を実施する。
- Claude readiness configured 後に、agent-scoped doctor または revised guidance が Codex 未導入を誤修復対象として扱わないことを確認する。

## 受け入れ基準

- [ ] Claude-only setup 後の推奨 validation path が、Codex 未導入を誤って blocking failure として扱わない。
- [ ] `doctor` に agent/scope 概念を追加する場合、Claude scope では Codex-only findings が red failure にならない。
- [ ] full/both-agent doctor では、Codex 欠落を従来通り検出できる。
- [ ] JSON output が agent に `selected scope` と `not-applicable` / `manual` / `red` の違いを説明できる。
- [ ] `phasegate-toolkit-guide` または `phasegate-config-doctor` が Claude-only `doctor` red の解釈を案内できる。
- [ ] `docs/guide/troubleshooting.md` に Claude-only setup readiness と full doctor の違いが反映される。
- [ ] registry dogfood で Claude-only setup 後の validation / doctor guidance を確認する。

## 非スコープ

- Codex hook feature flag の自動有効化
- hosted CI の remote 実行確認
- `phasegate:check-ready` / L2 validator の仕様変更
- WI-177 の post-readiness workflow 文言の全面再設計

## 関連 WI

- WI-175: setup completeness and confidence
- WI-176: agent-specific setup readiness
- WI-177: Claude Code post-readiness workflow and recovery guidance
