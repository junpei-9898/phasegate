# CLAUDE.md

<!-- @work-item-id WI-174, WI-176 -->

<!-- phasegate:managed-section:start -->
## 必読ドキュメント

- `docs/folder_management_rules.md`
- `docs/principles/architecture-philosophy.md`
- `docs/principles/testing-rules.md`

## PhaseGate Commands

{{PHASEGATE_COMMANDS}}

## Setup Readiness

Before planning implementation work in a new or upgraded repository, run `phasegate setup:agent --agent claude --dry-run --json` and inspect `plan.agentReadiness`.

- `agent=claude` covers `.claude/settings.json`, `CLAUDE.md`, and shared skills.
- `agent=shared` covers package scripts, `phasegate.config.json`, skills, and selected Husky/CI targets.
- `manual` or `external-actions` entries require user or hosted-service confirmation; do not treat local readiness as proof that external CI or user-level agent settings are complete.

## Phase Presets

{{PHASEGATE_PRESETS}}

## Skills

{{PHASEGATE_SKILLS}}

## User Section

<!-- phasegate:user-section:start -->
{{PHASEGATE_USER_SECTION}}
<!-- phasegate:user-section:end -->

## Agent Context Refresh

Run `phasegate ci:auto-refresh-agent-context --dry-run` to preview updates and `phasegate ci:auto-refresh-agent-context --apply` to write AGENTS.md / CLAUDE.md.
<!-- phasegate:managed-section:end -->
