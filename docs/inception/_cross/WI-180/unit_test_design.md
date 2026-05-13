# WI-180 Unit Test Design

<!-- @work-item-id WI-180 -->

## Cases

| Case ID | Target | Input | Expectation |
|---|---|---|---|
| UT-WI180-001 | `DiagnosticReportFormatter.formatJson` | Applicable findings | Adds `currentScopeRepairTarget: true`, `repairHintApplicability: "applicable"`, and `repairModeApplicability: "applicable"`. |
| UT-WI180-002 | `DiagnosticReportFormatter.formatJson` | Scoped-out findings | Keeps original `repairMode`, suppresses `repairHint` / `suggestedSkill`, and adds `currentScopeRepairTarget: false` plus only-if-selected applicability fields. |
| UT-WI180-003 | `DiagnosticReportFormatter.formatHuman` | Scoped-out findings | Summary includes the scoped-out `checkId` list and says the items are not repair targets. |

Existing doctor integration coverage exercises the formatter through the public handler boundary, so WI-180 keeps the focused assertions in `doctor-handler.test.ts`.
