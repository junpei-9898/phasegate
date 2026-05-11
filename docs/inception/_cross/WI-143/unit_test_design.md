# WI-143 Unit Test Design

<!-- @work-item-id WI-143 -->

| Case ID | Target | Scenario | Expected |
|---|---|---|---|
| UT-WI143-001 | `WiWorkflowDriftCheck` | no WI directories and one ad-hoc plan | red finding with `wi-workflow-drift` |
| UT-WI143-002 | `WiWorkflowDriftCheck` | `relaxedGates` contains `phase-gate` | message mentions the relaxed gate red flag |
| UT-WI143-003 | `WiWorkflowDriftCheck` | at least one WI directory exists | no finding for ad-hoc-plan-only drift |

## CLI Smoke Coverage

The publish-prep dogfood for WI-143 also exercises:

- `phasegate doctor` human and JSON output for drift fixtures.
- `phasegate scaffold-wi harness-api story`.
- `phasegate emit-agent-rules`.
- `phasegate init --workflow strict`.

