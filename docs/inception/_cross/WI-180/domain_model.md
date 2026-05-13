# WI-180 Domain Model: Effective Repair Applicability

<!-- @work-item-id WI-180 -->

## Concepts

| Concept | Meaning |
|---|---|
| Effective repair contract | Presentation-level JSON fields that say whether a diagnostic finding is repair work in the current doctor scope. |
| Current-scope repair target | Boolean interpretation of whether an agent should treat the finding as actionable repair for the selected `--agent`. |
| Repair mode applicability | Applicability marker for the existing `repairMode` field. |

## JSON Semantics

| Collection | Field | Value | Meaning |
|---|---|---|---|
| `findings[]` | `currentScopeRepairTarget` | `true` | The finding contributes to current doctor status and may be repaired now. |
| `findings[]` | `repairModeApplicability` | `"applicable"` | `repairMode` describes the current repair path. |
| `findings[]` | `repairHintApplicability` | `"applicable"` | `repairHint` is current-scope guidance when present. |
| `scopedOutFindings[]` | `currentScopeRepairTarget` | `false` | The finding is explanatory context for an unselected agent. |
| `scopedOutFindings[]` | `repairModeApplicability` | `"only-if-agent-selected"` | `repairMode` applies only if that agent is selected or installed. |
| `scopedOutFindings[]` | `repairHintApplicability` | `"only-if-agent-selected"` | Repair guidance is relevant only after selecting that agent. |

The underlying `DiagnosticFinding` domain object does not change. WI-180 adds presentation contract fields while preserving the domain invariant that `repairMode == "ai-assisted"` requires `suggestedSkill` before scoped-out serialization suppresses selected-scope repair guidance.
