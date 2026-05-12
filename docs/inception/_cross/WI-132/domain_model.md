# WI-132 Domain Model

@work-item-id WI-132

## Model

- `PublicContract`: public CLI/API/Port/config/domain/error contract. Required fields are `id`, `kind`, `sourcePath`, and `requiredBehaviors`.
- `TestObservation`: language-independent test evidence. `covers` contains semantic keys such as `cli.validate:success`.
- `ContractTraceabilityReport`: findings for required behavior cases without matching observations.

## Invariants

- Each required behavior case must be covered by at least one `TestObservation`.
- Port contracts require an `adapter-contract` observation for the port id.
- Existing L2-013 CLI E2E matching remains the concrete command-level signal; WI-132 adds the general semantic model.
