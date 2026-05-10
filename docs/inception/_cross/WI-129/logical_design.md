# WI-129 Logical Design

<!-- @work-item-id WI-129 -->

## Scope

`L2-003 test-quality` is changed from file-level text checks into a two-step design:

1. Language/framework adapters convert test source files into runner-independent `TestCaseStructure` records.
2. The validator evaluates semantic AAA policy against those records.

The TypeScript/Vitest adapter remains the first adapter, but its output model must not expose Vitest-specific names as the validator contract.

## Semantic Model

- `TestCaseStructure`: file path, test name, line, kind, steps, assertions, mocks, lifecycle exception flag.
- `ArrangeStep`: setup statement or fixture/helper call before the first Act.
- `ActStep`: observed behavior execution; may produce an observed value.
- `AssertStep`: observation against an Act result, emitted event, persisted effect, error contract, or interaction.

Unit tests require Arrange before Act before Assert, exactly one Act, and at least one Assert that observes the Act result. Lifecycle/E2E style tests may contain repeated Act/Assert pairs only when the test is explicitly classified as lifecycle-style by path or test text.

## TypeScript Adapter

The adapter parses `.ts` test files with TypeScript AST. It recognizes `it`, `test`, and common `.each` parameterized variants as test cases, converts top-level statements in the test body to semantic steps, and maps `expect(...)` calls to `AssertStep`.

TypeScript-specific policy still checks the local `actual` convention as a recommendation, but the core rule is that Assert targets the named Act observation.

