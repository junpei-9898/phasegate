---
id: WI-139
type: issue
status: drafted
---

# WI-139 Domain Model

## Semantic Model

- `DesignIntent`: behavior promised by product design.
- `ImplementationBehavior`: public behavior exposed by implementation.
- `TestObservation`: behavior asserted by tests.

All three use `unitName + behaviorId` as the semantic comparison key.

## SemanticDriftReport

Reports carry `kind`, `behaviorId`, `unitName`, `severity`, optional `location`, and `nextAction`.
