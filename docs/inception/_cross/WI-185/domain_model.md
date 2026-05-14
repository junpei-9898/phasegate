# WI-185 Domain Model

## Concepts

| Concept | Responsibility |
| --- | --- |
| Document scan request | Carries either rule pattern or explicit CLI override pattern. |
| Document scanner | Resolves relative patterns from the downstream project root and returns relative document paths. |
| Freshness rule | Supplies thresholds and the default document pattern when no CLI override exists. |
| Pointer rule | Supplies pointer policies and the default document pattern when no CLI override exists. |

## Invariants

- A scan request is always evaluated relative to the project root injected into the composition root.
- A single-file path such as `docs/sub/doc1.md` is a valid scan pattern and returns that file when it exists.
- `node_modules` and `.git` remain excluded from recursive scans.
