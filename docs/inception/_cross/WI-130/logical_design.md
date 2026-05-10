# WI-130 Logical Design

<!-- @work-item-id WI-130 -->

## Scope

Assertion quality is evaluated as semantic observation strength, not as raw matcher names. Framework adapters map framework syntax into `SemanticAssertion` records, then `L2-003` classifies weak observations.

## Semantic Assertion Model

- `AssertionTarget`: `observed-output`, `state`, `emitted-event`, `persisted-effect`, `error-contract`, `interaction`.
- `AssertionStrength`: `exact-value`, `shape`, `invariant`, `range`, `weak-truthiness`, `snapshot-only`, `interaction-only`, `length-only`.

The TypeScript adapter maps Vitest/Jest matcher calls to these categories. The policy warns on weak truthiness, snapshot-only, length-only, and interaction-only assertions. Error cases must assert error type, code, message, or recovery hint rather than only asserting that something throws.

