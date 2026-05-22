# WI-209 Domain Model

<!-- @work-item-id WI-209 -->

| Term | Definition |
|---|---|
| Personal Config Sandbox | Local-only PhaseGate configuration under `.phasegate-local/` that is not intended for team commits. |
| Agent Runtime Surface | The project-local paths read directly by an agent runtime, such as `.claude/settings.json`, `.claude/skills/`, `.codex/hooks.json`, and `.codex/skills/`. |
| Real Runtime Artifact | A regular file or directory at the agent runtime surface, not a symlink shim. |
| Managed Personal Artifact | A local-only artifact created by `phasegate install --personal` and recorded in `.phasegate/manifest.json` so uninstall can remove it precisely. |
| Team-owned File | Repository-owned files such as `package.json`, `CLAUDE.md`, `AGENTS.md`, Husky hooks, CI workflows, and `.gitignore` that personal install must not modify. |

## Invariants

<!-- @work-item-id WI-209 -->

- Agent runtime surfaces are real files/directories in `.claude/` and `.codex/`.
- Substantive PhaseGate config remains under `.phasegate-local/phasegate.config.json`.
- Personal runtime artifacts are hidden by `.git/info/exclude`, not by editing team `.gitignore`.
- Existing non-managed agent runtime files are never overwritten by default.
