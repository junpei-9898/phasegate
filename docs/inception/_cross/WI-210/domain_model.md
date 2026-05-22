# WI-210 Domain Model: Project Shared Skills Install

## Scope

Project install manages shared bundled skills as installation lifecycle artifacts. Personal install keeps the WI-209 contract: each selected agent gets a real local-only skill directory.

## Concepts

| Concept | Definition |
|---|---|
| Shared skills directory | The project root `skills/` directory used by non-personal installs. |
| Agent skill link | `.claude/skills` or `.codex/skills`, pointing at `../skills` in project install mode. |
| Bundled skill body | A selected `skills/<name>/` directory from the published PhaseGate package that contains `SKILL.md`. |
| Skill selection | `core` or `all`, using the existing bundled skill set definition. |
| Managed skill entry | A manifest entry for an individual `skills/<name>` directory or `skills/.harness-version` file. |

## Invariants

- A project install that enables Claude, Codex, or both must deploy selected bundled skill bodies into root `skills/` before exposing agent skill links.
- A valid project agent skill link is not sufficient by itself. The link target must contain PhaseGate skill content, either `SKILL.md` files or `.harness-version`.
- Manifest management must be granular enough that uninstall can remove PhaseGate-managed skill bodies without deleting user-owned skill directories.
- `reconcile` and the `update-skills` alias repair older installs that have valid links but missing or empty root `skills/`.
- Personal install remains separate and continues to write real per-agent runtime skill directories.

