---
id: WI-173
type: story
severity: high
status: drafted
affects: [setup, agent-integration, config-foundation, skills, documentation]
source: internal
---

# WI-173: Agent Configuration Change Workflow

> 起票日: 2026-05-12
> 起票経緯: 初回 setup 後も、利用者が agent に自然言語で依頼すれば PhaseGate 設定を安全に変更・検証・説明できる workflow を確立するため。

## スコープ

- validation strictness change
- L4 rollout / fail-on-warning change
- CI template regeneration
- Codex / Claude hook enablement
- baseline reset / adoption
- protected file policy change
- quick mode policy change
- report output path change
- intent -> config path / command / validation mapping
- change safety: backup, diff explanation, managed target boundaries, user-local setting boundaries
- post-change validation: doctor, lint, validate layer, check-ready, generated workflow diff
- rollback / recovery guidance
- docs and skills guidance for agent operators

## 主要成果物

- `docs/guide/configuration.md`
- `docs/guide/recipes.md`
- `docs/guide/troubleshooting.md`
- `docs/guide/hooks-integration.md`
- `skills/phasegate-config-doctor/SKILL.md`
- `skills/phasegate-toolkit-guide/SKILL.md`
- 必要なら config change planner / validator extension

## 受け入れ基準

- [ ] 「L4 を厳しめにして」「Codex hook を有効にして」「CI では warning を fail にして」などの依頼から、agent が変更対象と検証手順を選べる。
- [ ] repo managed artifact と user-level / local-only artifact を混同しない。
- [ ] agent が変更前後の差分、理由、残るリスク、確認済み検証を説明できる。
- [ ] 設定変更後に drift guardrail または doctor によって、docs / schema / install target / runtime state の不整合を検出できる。

## 依存

`WI-152`, `WI-153`, `WI-156`, `WI-171`, `WI-172`。
