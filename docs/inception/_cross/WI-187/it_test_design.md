---
traceability:
  initial_creation: true
---

# WI-187 Integration Test Design

<!-- @work-item-id WI-187 -->

| Case ID | Flow | Expectation |
|---|---|---|
| IT-WI187-001 | Create only `docs/inception/_shared/foo_plan.md`, run doctor JSON | `wi-workflow-drift` is red/manual with `repairHint: null`. |
| IT-WI187-002 | Run `migrate work-items --apply` on the same fixture, then rerun doctor JSON | Migration applies zero candidates and the same drift remains, proving the old repair command would be a no-op. |

The regression assertion is intentionally flow-based rather than only checking a static field, so future changes cannot reintroduce a copy-paste repair hint that does not clear the doctor finding.
