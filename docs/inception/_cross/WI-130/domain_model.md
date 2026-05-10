# WI-130 Domain Model

<!-- @work-item-id WI-130 -->

## Assertion Semantics

`SemanticAssertion` is owned by `validator-system` and contains:

- target: observed output, state, emitted event, persisted effect, error contract, or interaction.
- strength: exact value, shape, invariant, range, weak truthiness, snapshot only, interaction only, or length only.
- subject expression: runner-specific source text retained only as evidence.
- line: source location for diagnostics.

## Policy

Weak assertions do not fail because a matcher name is banned; they warn because their semantic strength is insufficient to prove behavior. Adapter-specific matcher maps are implementation details.

