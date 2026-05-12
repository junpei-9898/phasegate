# WI-115 Domain Model

## Concepts

| Concept | Owner | Meaning |
|---|---|---|
| `legacy_id` | traceability-model | Historical alias kept in WI frontmatter. |
| Unit context | phase-dependency-model | Unit inferred from product construction path. |
| Ambiguous legacy ID | phase-dependency-model | More than one WI in the active scope has the same legacy alias. |

## Invariants

- Unit context narrows lookup to the product unit plus cross-cutting WIs.
- Different units may reuse historical IDs without interfering with each other when unit context exists.
- No-context lookup treats duplicate legacy IDs as ambiguous.
- Ambiguous lookup returns no match rather than choosing an arbitrary WI.

