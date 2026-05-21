# Domain Model: Codex Hooks Feature Flag Rename

<!-- @work-item-id WI-205 -->

## Concepts

| Concept | Definition |
|---|---|
| Codex Hooks Feature Flag | The user-level Codex CLI feature flag that enables native hook execution. The current canonical flag name is `hooks`. |
| Legacy Codex Hooks Alias | The deprecated `codex_hooks` flag name that Codex still accepts as a compatibility alias but warns about at startup. |
| External Setup Action | A user-level action PhaseGate can recommend but does not mutate automatically, such as enabling Codex hooks in `~/.codex/config.toml`. |

## Invariants

- PhaseGate setup guidance must recommend `codex features enable hooks`.
- Manual configuration examples must use `[features] hooks = true`.
- PhaseGate may describe `codex_hooks` only as a legacy alias when explaining migration or troubleshooting.
