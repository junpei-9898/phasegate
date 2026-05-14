# WI-188 Domain Model

## Concepts

| Concept | Responsibility |
| --- | --- |
| Requirement test matrix | Story-indexed source of requirement test coverage. |
| Story coverage entry | Matrix entry for one requested story. |
| No-tests coverage result | Deterministic skipped result for stories with zero mapped tests. |
| Coverage runner prerequisite | Local coverage summary or local Vitest dependency required before running coverage. |

## Invariants

- Unknown story IDs never produce implicit `{ total: 0, covered: 0 }` coverage.
- No-tests paths do not invoke Vitest.
- Missing Vitest dependency produces a structured `COVERAGE_RUN_FAILED` guidance error without invoking `npx`.
