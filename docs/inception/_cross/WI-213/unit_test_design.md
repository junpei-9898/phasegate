# WI-213 Unit Test Design

## Installation Integration Cases

| Case | Expected result |
|---|---|
| `install --personal --agent claude --apply` | Creates `.claude/CLAUDE.local.md`, `.git/hooks/pre-commit`, `.git/hooks/commit-msg`, and local reference docs. |
| `install --personal --agent codex --apply` | Creates `.codex/AGENTS.local.md`, local git hooks, and local reference docs. |
| Personal install with team-owned files present | `AGENTS.md`, `CLAUDE.md`, `.husky/*`, and root `docs/principles/*` bytes are unchanged. |
| Personal config after install | `paths.designDocs` and `paths.inceptionDocs` point under `.phasegate-local/`. |

