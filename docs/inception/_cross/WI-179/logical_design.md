# WI-179 Logical Design: Scoped-Out Doctor Finding Repair Guidance

<!-- @work-item-id WI-179 -->

## Design

`doctor --agent claude` and `doctor --agent codex` keep the WI-178 scoped-readiness behavior, but scoped-out findings suppress actionable repair guidance for the selected-agent report.

The JSON report keeps the original `scopedOutFindings` collection so agents can explain why an unselected agent check was observed. Each scoped-out item now makes repair applicability explicit:

- `applicability: "not-applicable"` continues to mean the finding does not affect `overallStatus` or `exitCode`.
- `repairHint: null` and `suggestedSkill: null` prevent agents from treating the unselected agent as the next repair target.
- `repairHintApplicability: "only-if-agent-selected"` explains that the omitted repair guidance is useful only when the user intentionally selects or installs that agent.

Applicable findings in `findings[]` remain unchanged except for an explicit `repairHintApplicability: "applicable"` marker. Default `doctor` / `doctor --agent both` therefore still exposes the existing `repairHint` and `suggestedSkill` contract.

Human output should describe scoped-out findings as explanatory, not repair targets, so terminal users get the same interpretation without inspecting JSON fields.

## Affected Surfaces

- `DiagnosticReportFormatter`: sanitizes scoped-out JSON fields and annotates repair applicability.
- `DoctorHandler` integration tests: assert scoped-out repair guidance is suppressed while full-scope findings retain repair hints.
- Public troubleshooting and CLI docs: explain how to read scoped-out repair guidance.
- Guidance skills: instruct agents not to propose repair work from `scopedOutFindings` unless the user selects that agent.
