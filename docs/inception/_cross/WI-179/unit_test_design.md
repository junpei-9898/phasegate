# WI-179 Unit Test Design

<!-- @work-item-id WI-179 -->

## Cases

| Case ID | Target | Expectation |
|---|---|---|
| UT-WI179-001 | `DiagnosticReportFormatter` JSON output for `--agent claude` | `scopedOutFindings[]` has `repairHint: null`, `suggestedSkill: null`, and `repairHintApplicability: "only-if-agent-selected"`. |
| UT-WI179-002 | `DiagnosticReportFormatter` JSON output for full scope | Applicable `findings[]` preserve the existing `repairHint` / `suggestedSkill` values and set `repairHintApplicability: "applicable"`. |
| UT-WI179-003 | `DiagnosticReportFormatter` human output | Scoped-out summary states that scoped-out findings are explanatory and not repair targets. |
