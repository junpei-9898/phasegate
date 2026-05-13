---
id: WI-172
type: story
severity: high
status: tested
affects: [setup, agent-integration, config-foundation, skill-quality, documentation]
source: internal
---

# WI-172: Agent-Driven PhaseGate Setup Orchestrator

> 起票日: 2026-05-12
> 起票経緯: `phasegate init` 後に agent が repo 状態を診断し、必要な質問と推奨設定を提示し、回答に基づいて PhaseGate 設定を自動完了できる体験を設計・実装するため。

## スコープ

- repo 状態検出: package manager, CI provider, existing hooks, agent type, monorepo shape, existing `phasegate.config.json`, existing `.claude` / `.codex` / `.husky` / `.github` files
- setup intent classification: minimal, recommended, strict, CI-only, agent-hooks, retrofit
- interactive question set: project preset, validation strictness, hook installation, CI rollout, baseline adoption, L4 fail-on-warning, Codex / Claude integration
- generated plan: config changes, hook changes, workflow changes, skill deployment changes, backup / rollback information
- execution path: write config, run install / reconcile, run doctor, run check-ready, summarize next actions
- dry-run / apply / confirm modes
- integration with `phasegate-config-doctor` and `phasegate-toolkit-guide`

## 主要成果物

- 新規 CLI または既存 CLI 拡張: 例 `phasegate setup:agent` / `phasegate init --interactive-agent`
- setup orchestration design in product construction
- `docs/guide/getting-started.md` / `docs/guide/installation.md` / `docs/guide/hooks-integration.md`
- skills update: `skills/phasegate-config-doctor/SKILL.md`, `skills/phasegate-toolkit-guide/SKILL.md`

## 受け入れ基準

- [x] agent が `init` 後に repo 状態を読み、足りない情報だけを質問できる。
- [x] 質問への回答から、`phasegate.config.json`, hooks, workflows, skills, baseline などの変更案を生成できる。
- [x] 適用前に差分・理由・リスク・rollback path を説明できる。
- [x] 適用後に `doctor` / `check-ready` 相当の検証を実行し、完了・警告・追加質問を区別して報告できる。
- [x] 非対話 CI や human-only 利用者向けに、同じ判断を docs / JSON plan / dry-run で確認できる。

## 依存

`WI-152`, `WI-153`, `WI-156`, `WI-169`, `WI-171`。

## 対応結果

`phasegate setup:agent` を追加し、repo setup state の検出、intent 別質問、変更案、リスク、rollback、validation を JSON / human で出力できるようにした。`--apply` は structured install path に委譲する。
