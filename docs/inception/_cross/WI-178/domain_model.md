# WI-178 Domain Model: Agent-Scoped Doctor Readiness

<!-- @work-item-id WI-178 -->

## Concepts

| Concept | Meaning |
|---|---|
| `DoctorAgentScope` | Selected diagnostic scope: `claude`, `codex`, or `both`. `both` is the backward-compatible default. |
| Applicable finding | A normal doctor finding that belongs to the selected scope and contributes to status and exit code. |
| Scoped-out finding | A finding from an unselected agent-specific target. It is observable in JSON for explanation, but has `applicability: "not-applicable"` and does not contribute to status or exit code. |
| Shared target | A doctor check that is not agent-specific, such as Husky, CI, package.json, and WI workflow drift. Shared targets remain applicable for every scope. |

## Scope Mapping

| Scope | Applicable agent-specific checks | Scoped-out checks |
|---|---|---|
| `claude` | `claude-hook-missing`, `claude-skills-symlink` | `codex-hook-missing`, `codex-skills-symlink` |
| `codex` | `codex-hook-missing`, `codex-skills-symlink` | `claude-hook-missing`, `claude-skills-symlink` |
| `both` | all agent-specific checks | none |

Shared checks are always applicable.

## JSON Contract

The existing top-level report remains compatible and adds:

- `scope.agent`: selected scope.
- `scope.description`: plain-language explanation of what the scope means.
- `findings[].applicability: "applicable"`.
- `scopedOutFindings[]`: original finding fields plus `applicability: "not-applicable"` and `scopeReason`.

`overallStatus` and `exitCode` are derived from applicable findings only.
