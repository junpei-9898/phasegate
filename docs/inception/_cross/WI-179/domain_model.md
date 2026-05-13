# WI-179 Domain Model: Scoped-Out Doctor Finding Repair Guidance

<!-- @work-item-id WI-179 -->

## Concepts

| Concept | Meaning |
|---|---|
| Applicable finding | A normal doctor finding in `findings[]`; it contributes to status and may carry actionable `repairHint` or `suggestedSkill`. |
| Scoped-out finding | A finding in `scopedOutFindings[]`; it belongs to an unselected agent and is explanatory for the current doctor scope. |
| Repair hint applicability | A JSON marker that tells an agent whether repair guidance is actionable in the current scope. |
| Suppressed repair guidance | `repairHint: null` and `suggestedSkill: null` on scoped-out items, used to avoid accidental repair proposals for unselected agents. |

## JSON Contract

| Location | `applicability` | `repairHintApplicability` | `repairHint` / `suggestedSkill` |
|---|---|---|---|
| `findings[]` | `applicable` | `applicable` | Existing values are preserved. |
| `scopedOutFindings[]` | `not-applicable` | `only-if-agent-selected` | Always `null` in the selected-agent report. |

`scopeReason` remains present on scoped-out findings and explains why the check is not applicable to the selected `--agent`.

## Invariants

- Scoped-out findings never influence `overallStatus` or `exitCode`.
- Scoped-out findings are visible for explanation but are not selected-agent repair targets.
- Full-scope diagnostics preserve the existing repair guidance behavior.
