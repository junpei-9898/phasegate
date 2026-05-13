# WI-180 Logical Design: Scoped-Out Doctor Effective Repair Contract

<!-- @work-item-id WI-180 -->

## Design

`doctor --agent claude` and `doctor --agent codex` continue to report unselected-agent findings under `scopedOutFindings[]`, but each item now exposes an effective repair contract for the current scope.

Scoped-out findings preserve the original diagnostic facts such as `checkId`, `severity`, `target`, `message`, and `repairMode`. They add selected-scope semantics so a reader does not need to infer repair actionability from suppressed hints alone:

- `currentScopeRepairTarget: false` means the finding is not repair work for the selected `--agent`.
- `repairHintApplicability: "only-if-agent-selected"` keeps WI-179 hint semantics.
- `repairModeApplicability: "only-if-agent-selected"` clarifies that the original `repairMode` describes what would happen if the unselected agent were selected, not what should be repaired now.
- `repairHint: null` and `suggestedSkill: null` remain intentionally suppressed in scoped reports.

Applicable findings in `findings[]` expose the positive side of the same contract:

- `applicability: "applicable"`
- `currentScopeRepairTarget: true`
- `repairHintApplicability: "applicable"`
- `repairModeApplicability: "applicable"`

Human output should include the scoped-out `checkId` list so terminal users can see what was excluded without opening JSON. The summary must still state that these are not repair targets for the selected scope.

## Affected Surfaces

- `DiagnosticReportFormatter`: serializes the effective repair fields and renders scoped-out check IDs.
- `DoctorHandler` integration tests: assert scoped-out and applicable repair applicability fields.
- Public CLI / troubleshooting docs: explain `repairModeApplicability` and `currentScopeRepairTarget`.
- Guidance skills: instruct agents to use the effective repair fields before proposing setup repair.
