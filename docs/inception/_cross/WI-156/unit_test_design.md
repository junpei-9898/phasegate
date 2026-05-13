---
traceability:
  initial_creation: true
---

# WI-156 Unit Test Design

| Case ID | Target | Scenario | Expected |
|---|---|---|---|
| UT-WI156-001 | `SkillCatalogDriftService` | All total declarations equal actual count | No findings. |
| UT-WI156-002 | `SkillCatalogDriftService` | One total declaration differs | One `skill-count-mismatch` finding. |
| UT-WI156-003 | `SkillCatalogDriftService` | Category total differs | One `skill-category-total-mismatch` finding. |
| UT-WI156-004 | `ValidatorId` | `L4-006` is created | Name is `skill-catalog-drift`. |
