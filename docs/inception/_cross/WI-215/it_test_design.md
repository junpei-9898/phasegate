# Integration Test Design

| ID | Flow | Expected |
|---|---|---|
| IT-WI215-CODEX-PROMPT-001 | In a temp git repo, run `phasegate install --personal --agent codex --apply`, then run `codex debug prompt-input "probe"` | Rendered prompt input contains a PhaseGate personal context sentinel. |
| IT-WI215-CODEX-TEAM-001 | Same flow with an existing team `AGENTS.md` | Team guidance remains visible and personal PhaseGate guidance is also visible, or install/doctor reports a manual step instead of claiming configured readiness. |
| IT-WI215-CLAUDE-PATH-001 | Run `phasegate install --personal --agent claude --apply` | Created Claude context path matches a documented Claude Code discovery path and legacy `.claude/CLAUDE.local.md` is not the only context artifact. |
| IT-WI215-DOCTOR-001 | Run `phasegate doctor --personal --agent both --json` after personal install | Readiness reflects runtime-visible context for both agents; no false green when context is only in legacy local filenames. |
| IT-WI215-DOCS-001 | Inspect README and guide docs | Personal install docs name the exact runtime-visible context files and mention any required Codex manual launch/config step. |
