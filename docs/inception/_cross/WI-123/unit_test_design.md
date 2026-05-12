---
id: WI-123
type: issue
status: drafted
---

# WI-123 Unit Test Design

## Cases

| ID | Target | Scenario | Expected |
| --- | --- | --- | --- |
| UT-WI123-HSS-001 | `HarnessStatusSummary` | hook/baseline health supplied | fields are preserved in JSON-serializable object |
| UT-WI123-HSS-002 | `HarnessStatusSummary` | operational warning supplied | warning code and next action are preserved |
| UT-WI123-CFG-001 | `HarnessConfigQueryAdapter` | baseline snapshot exists | `grandfatheredFileCount` is returned |
| UT-WI123-CFG-002 | `HarnessConfigQueryAdapter` | snapshot sha mismatch | `shaMismatchCount` increments |
| UT-WI123-DISPATCH-001 | `CommandDispatchService` | `phasegate:status` has optional operational provider methods | status data includes hook and baseline health |

@work-item-id WI-123
