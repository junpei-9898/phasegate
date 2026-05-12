# WI-110 Domain Model

<!-- @work-item-id WI-110 -->

## Concepts

### Validator Ownership

Validator ownership is determined by the validator ID prefix and the `ValidatorDefinition.layer` value. For WI-110, `L2-013` keeps its L2 prefix and is registered with layer `L2`.

### Layer Execution Boundary

A layer execution boundary is the set of validators a layer-specific use case may return. The boundary is valid only when every returned validator ID uses the same layer prefix as the requested layer.

### CLI E2E Coverage Validator

`L2-013 cli-e2e-test-existence` checks coverage evidence for public CLI command contracts. It is not an L1 source hygiene rule. Its result is part of L2 gate evaluation.

## Invariants

- `RunL1ValidatorsUseCase` returns only `L1-*` validator results.
- `RunL2ValidatorsUseCase` returns `L2-013` in the default L2 validator set.
- `ValidatorRegistry` and default config agree that `L2-013` is owned by L2.
- CLI output for layer-specific validation must match the validator ID prefix of that layer.

