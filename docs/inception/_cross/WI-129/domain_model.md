# WI-129 Domain Model

<!-- @work-item-id WI-129 -->

## Test Quality Semantics

`validator-system` owns a semantic model for test quality:

- `TestCaseStructure`: runner-independent unit of validation.
- `TestStep`: discriminated union of `arrange`, `act`, and `assert`.
- `TestObservation`: named or implicit value produced by Act.
- `TestDoubleReplacement`: replacement of a dependency, classified as external dependency or domain/internal dependency.
- `TestQualityViolation`: semantic policy violation with file/test/line evidence.

## Policies

- AAA structure is evaluated per test case, not per file.
- Act cardinality is one for unit/integration tests.
- Assert must observe the Act output or a valid externally observable effect.
- Domain/internal dependency replacement is prohibited in domain layer tests; external I/O, time, randomness, process boundary, and port implementations may be replaced.
- Lifecycle/E2E exceptions are explicit policy cases, not silent bypasses.

