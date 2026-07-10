---
id: WI-205
type: issue
severity: normal
status: tested
affects: [setup, agent-integration, harness-api]
source: internal
---

# WI-205: Codex hooks feature flag guidance still uses deprecated `codex_hooks`

Codex CLI v0.131.0 reports `[features].codex_hooks` as a deprecated legacy alias and asks users to use `[features].hooks` instead.

PhaseGate still prints and documents `codex features enable codex_hooks` in setup guidance, public guides, and generated agent context. New installs should point users to `codex features enable hooks` and manual config should show `hooks = true`.

## Acceptance Criteria

- Setup CLI output and `config:plan --intent codex-hooks` use `codex features enable hooks`.
- Public Codex setup documentation uses `[features].hooks` / `hooks = true`.
- Generated `AGENTS.md` template references the non-deprecated Codex hooks feature flag.
- Existing compatibility notes may mention `codex_hooks` only as a legacy alias, not as the recommended command.
