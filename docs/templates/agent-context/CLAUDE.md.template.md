# CLAUDE.md

<!-- @work-item-id WI-174, WI-176, WI-177, WI-331 -->

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

After the `claude` and `shared` rows are `configured`, move from setup to work planning:

1. Confirm the target WI under `docs/inception/**/{WI-XXX}/description.md`, or create the next unused WI if the user asks for new work.
2. For implementation work, prepare or update the WI plan/design files under `docs/inception/.../{WI-XXX}/` before editing source or tests.
3. Reflect the accepted design into the relevant `docs/product/...` files with `@work-item-id WI-XXX`.
4. Run `phasegate phasegate:check-ready` or the requested `phasegate validate --layer ...` command before committing.

If `setup:agent --apply --json` or `install --apply --json` fails with a structured `error`, explain `target`, `operation`, `code`, `likelyCause`, `recovery`, and `partialChanges` before retrying. Use `invoke /phasegate-config-doctor` for managed target conflicts and `invoke /phasegate-toolkit-guide` for read-only setup guidance.

## Phase Presets

{{PHASEGATE_PRESETS}}

## Skills

{{PHASEGATE_SKILLS}}

## Agent Context Refresh

Run `phasegate ci:auto-refresh-agent-context --dry-run` to preview updates and `phasegate ci:auto-refresh-agent-context --apply` to write AGENTS.md / CLAUDE.md.
<!-- phasegate:managed-section:end -->

## User Section

<!-- phasegate:user-section:start -->
{{PHASEGATE_USER_SECTION}}
<!-- phasegate:user-section:end -->
