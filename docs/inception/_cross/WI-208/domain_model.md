# WI-208 Domain Model

<!-- @work-item-id WI-208 -->

## Terms

| Term | Definition |
|---|---|
| Personal Sandbox | A local-only PhaseGate directory under `.phasegate-local/` that stores user-owned setup artifacts without changing team-owned project files. |
| Root Shim | A git-ignored root-level adapter such as `.claude` symlink or `.claude/settings.json` symlink that lets an agent discover personal sandbox artifacts from its expected path. |
| Team-Owned File | Repository file that may affect other collaborators when committed, such as `package.json`, `CLAUDE.md`, `AGENTS.md`, Husky scripts, CI workflows, and `.gitignore`. |
| Personal Config Fallback | Config resolution rule that allows PhaseGate commands to read `.phasegate-local/phasegate.config.json` when root `phasegate.config.json` is absent. |
| Manual External Action | A setup task outside local repository ownership, such as Codex user-level hook enablement or GitHub CLI authentication. |

## Invariants

- Personal install may create local-only artifacts, but must not mutate team-owned files.
- Personal Claude Code setup requires a root-discoverable `.claude` path, but that path must be ignored through `.git/info/exclude`.
- Personal config fallback must not override an explicit root `phasegate.config.json`.
- Existing `.claude` content must be preserved unless a user explicitly chooses a force or migration path.
- GitHub CLI authentication, repo secrets, and hosted CI state are never personal install apply targets.
