---
traceability:
  initial_creation: true
---

# WI-176 Domain Model

<!-- @work-item-id WI-176 -->

## AgentReadinessEntry

`AgentReadinessEntry` is a presentation DTO owned by the `setup:agent` planning surface.

| Property | Type | Constraint |
|---|---|---|
| `agent` | `"claude" \| "codex" \| "shared"` | stable row id |
| `status` | `SetupCompletenessStatus` | reuses the existing setup status vocabulary |
| `evidence` | `readonly string[]` | non-empty local evidence or planned action explanation |
| `nextAction` | `string \| null` | null when no local action remains |
| `risk` | `string \| null` | explicit residual risk |

## Readiness Rules

| Row | Configured when |
|---|---|
| `claude` | `.claude/settings.json`, `CLAUDE.md`, and `skills/.harness-version` exist |
| `codex` | `.codex/hooks.json`, `AGENTS.md`, and `skills/.harness-version` exist |
| `shared` | `package.json`, `phasegate.config.json`, `skills/.harness-version`, selected Husky targets, and selected CI workflow exist |

Rows not selected by `--agent` return `not-applicable`. `shared` is always included because package/config/validation state affects every agent.
