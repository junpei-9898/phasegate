# WI-190 Logical Design

## Scope

`ci:auto-refresh-agent-context` and `reconcile` must render the same managed CLAUDE.md content from the shared agent-context template contract. Auto-refresh remains responsible for the dynamic AGENTS lesson pointer section; reconcile remains responsible for managed install sections.

## Design

- Align `RefreshClaudeMdUseCase` values with the install/reconcile renderer for commands, presets, skills, and default user section.
- Preserve user-owned CLAUDE.md content through the existing user-section markers.
- Add regression coverage that dry-run preview contains the reconcile-compatible command set and omits the older auto-refresh-only command list.

## Verification

- `ci:auto-refresh-agent-context --apply --json` followed by `reconcile --dry-run --json` should not produce CLAUDE.md managed-section drift.
- Existing AGENTS.md lesson pointer refresh continues to only update the lesson pointer section.
