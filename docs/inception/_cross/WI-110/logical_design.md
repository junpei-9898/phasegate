# WI-110 Logical Design

<!-- @work-item-id WI-110 -->

## Decision

`L2-013 cli-e2e-test-existence` belongs to L2, not L1.

The validator checks whether public CLI commands have E2E coverage. This is a repository contract and gating signal, so it must run with the L2 validation path alongside phase-gate, metadata, test-quality, and work-item-status validators.

## Execution Boundary

- `RunL1ValidatorsUseCase` executes only L1 validators:
  - `L1-017` IT test internal mock detection
  - `L1-018` stub comment detection
- `RunL2ValidatorsUseCase` resolves all L2 definitions from `ValidatorRegistry.listByLayer("L2")`.
- The default registry and default L2 config include `L2-013`.
- `validate --layer L1` must not emit any `L2-*` validator ID.
- `validate --layer L2` must emit `L2-013` when the default L2 validator set is used.

## Regression Signal

The boundary is protected by integration tests for both use cases:

- L1 execution asserts no result has an `L2-` prefix.
- L2 default execution asserts `L2-013` is part of the returned validator set.

