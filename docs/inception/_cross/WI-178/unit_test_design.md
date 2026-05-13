# WI-178 Unit Test Design

<!-- @work-item-id WI-178 -->

## Cases

| Case ID | Target | Expectation |
|---|---|---|
| UT-WI178-001 | `RunDoctorDiagnosticsUseCase` with `agent: "claude"` | Codex-only findings are moved to `scopedOutFindings`; applicable report can be green and exit 0. |
| UT-WI178-002 | `RunDoctorDiagnosticsUseCase` with `agent: "both"` | Existing full-scope red behavior is preserved. |
| UT-WI178-003 | `DiagnosticReportFormatter` JSON output | Output includes `scope`, `findings[].applicability`, and `scopedOutFindings[].applicability = "not-applicable"`. |
| UT-WI178-004 | CLI argument parsing | Invalid `--agent` values are rejected before running doctor. |
