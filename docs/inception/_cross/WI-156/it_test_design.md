---
traceability:
  initial_creation: true
---

# WI-156 IT Test Design

| Case ID | Scenario | Input | Expected |
|---|---|---|---|
| IT-WI156-001 | `L4-006` is selected by default L4 execution | `RunL4ValidatorsUseCase.execute({ strictMode:false })` | Returned validator IDs include `L4-006`. |
| IT-WI156-002 | Declared skill count differs from actual catalog | Adapter/service fixture with actual count 30 and documented count 29 | `L4-006` returns a warning finding naming the source document and expected count. |
| IT-WI156-003 | Skills overview category total differs from actual catalog | Category heading counts sum to 29 while actual is 30 | `L4-006` returns a warning finding for category total drift. |
| IT-WI156-004 | Current repository docs and skill catalog are in sync | Real repository execution through `validate --layer L4 --format human` | `L4-006` passes as part of the scheduled validator set. |
