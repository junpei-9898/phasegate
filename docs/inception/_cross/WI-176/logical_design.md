---
traceability:
  initial_creation: true
---

# WI-176 Logical Design

<!-- @work-item-id WI-176 -->

## Scope

WI-176 narrows the remaining Claude Code dogfood gap by making `setup:agent` explicitly report agent-specific readiness. The existing `plan.completeness` remains the area-based setup summary; this WI adds a second view that answers the question an agent asks at startup: "is my own runtime context ready, and what shared setup still needs work?"

## CLI Contract

`setup:agent --json` adds `plan.agentReadiness`.

| Field | Meaning |
|---|---|
| `agent` | `claude`, `codex`, or `shared` |
| `status` | Same status vocabulary as `plan.completeness`: `configured`, `planned`, `manual`, `not-applicable`, or `unknown` |
| `evidence` | Local evidence or planned target explanation |
| `nextAction` | The next command or manual instruction, or `null` |
| `risk` | Residual local/external risk, or `null` |

The `claude` row is selected by `--agent claude` or `--agent both` and is configured only when `.claude/settings.json`, `CLAUDE.md`, and bundled skills exist. The `codex` row mirrors that contract for `.codex/hooks.json`, `AGENTS.md`, and skills. The `shared` row covers package/config/skills plus selected Husky and CI targets.

## Output Boundary

Agent readiness is still local evidence. Claude readiness does not prove the Claude Code application has opened the repository, and Codex readiness does not prove the user-level `codex_hooks` feature is enabled. Hosted CI execution remains external even when the workflow file exists.

## Documentation Boundary

`CLAUDE.md` should point Claude Code to:

- inspect `plan.agentReadiness` before planning implementation work;
- use `setup:agent --agent claude` for Claude-only recovery;
- use `--agent both` when shared Claude/Codex setup matters;
- treat `external-actions` and hosted CI checks as manual evidence rather than local readiness.
