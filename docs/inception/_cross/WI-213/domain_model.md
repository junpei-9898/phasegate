# WI-213 Domain Model: Personal Core Defense Deployment

## Scope

Personal install is a local-only installation mode for evaluating PhaseGate in a team-owned repository. It must not mutate team-owned project files, but it still must deploy local equivalents for the core defenses that make PhaseGate usable.

## Concepts

| Concept | Definition |
|---|---|
| Personal sandbox | Local-only PhaseGate area under `.phasegate-local/` that is excluded from commits. |
| Local agent context | Agent-readable guidance stored in local-only agent paths such as `.claude/CLAUDE.local.md` or `.codex/AGENTS.local.md`. |
| Local git hook | Repository-local hook under `.git/hooks/`, not `.husky/`, used to enforce commit-time checks without changing shared files. |
| Local reference docs | Copies of `docs/folder_management_rules.md` and `docs/principles/*.md` under `.phasegate-local/docs/`. |
| Personal config paths | `phasegate.config.json` paths that point validators and skills at local-only inception/product document roots. |

## Invariants

- Personal install never writes `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `docs/folder_management_rules.md`, or `docs/principles/*`.
- Personal install must deploy a readable agent context for each selected agent.
- Personal install must deploy local `pre-commit` and `commit-msg` hooks under `.git/hooks/`.
- Personal install must provide local copies of the reference docs that bundled skills name.
- Personal config must point design/inception paths at `.phasegate-local/product` and `.phasegate-local/inception`.

