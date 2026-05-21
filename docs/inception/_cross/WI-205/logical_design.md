# Logical Design: Codex Hooks Feature Flag Guidance

<!-- @work-item-id WI-205 -->

## Scope

Update the setup and agent-integration guidance surfaces that emit Codex hook enablement instructions.

## Design

- Keep project-local hook files unchanged: `.codex/hooks.json` remains the managed runtime hook definition.
- Change user-level enablement guidance from `codex features enable codex_hooks` to `codex features enable hooks`.
- Change manual TOML examples from `codex_hooks = true` to `hooks = true`.
- Preserve the distinction between project-local artifacts and user-level Codex configuration.

## Affected Surfaces

- README quick setup snippets.
- `docs/guide/codex-integration.md`, installation, recipes, troubleshooting, and setup artifact inventory.
- `docs/templates/agent-context/AGENTS.md.template.md`.
- `scripts/harness/main.ts` setup summaries, config plan output, and init next steps.
