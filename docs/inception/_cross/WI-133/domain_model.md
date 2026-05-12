# WI-133 Domain Model

@work-item-id WI-133

## Model

- `BoundaryCaseKind`: empty input, missing required, invalid enum, duplicate id, unknown reference, permission denied, config disabled, partial failure, idempotency, backward compatibility.
- Boundary observation key: `{contractId}:boundary:{case}`.

## Invariants

- Boundary cases are derived from public contracts or models and must be observed by tests.
- Missing required, invalid enum, duplicate id, and unknown reference are required severity by default.
