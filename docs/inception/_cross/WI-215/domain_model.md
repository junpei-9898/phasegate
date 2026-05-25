# Domain Model

## Terms

| Term | Definition |
|---|---|
| Runtime-visible Agent Context | An instruction file placed at a path that the target agent actually loads into the prompt at session start. |
| Personal Context Artifact | A local-only instruction file created by personal install and hidden from git through `.git/info/exclude`. |
| Team-owned Agent Context | Repository-shared `AGENTS.md` / `CLAUDE.md` files that personal install must not mutate. |
| Discovery-compatible Target | A file path and filename combination recognized by the agent's documented discovery algorithm. |
| False Green Readiness | A doctor/test result that reports personal agent context as configured even though the runtime will not load it. |

## Invariants

- Personal install must not modify team-owned `AGENTS.md` or `CLAUDE.md`.
- Every personal context artifact reported as configured must be discoverable by the selected agent runtime without extra undocumented behavior.
- Codex personal context must not suppress an existing team `AGENTS.md` unless the generated local file explicitly preserves the team guidance contract.
- Claude personal context must use either a documented project instruction path or a documented local instruction path.
- Uninstall must remove only PhaseGate-managed personal context artifacts and must not delete user-created agent context files.
