# WI-108 Domain Model

<!-- @work-item-id WI-108 -->

| Concept | Responsibility |
|---|---|
| CI check result | Aggregate result for L2-L4 validator execution |
| Validator result item | Per-validator `passed` / `skipped` / `errors` record |
| Full CI contract | Public command promise that CI output covers L2-L4, including skipped disabled validators |

## Invariants

- `phasegate:ci-check --json` must expose enough layer detail to audit what ran.
- skipped validators remain part of the result set.
- `allPassed` may be true when disabled L4 validators are skipped, but the skip must be observable.

