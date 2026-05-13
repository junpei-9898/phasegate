---
traceability:
  initial_creation: true
---

# WI-156 Logical Design

## Validator

Add `L4-006 skill-catalog-drift` to the scheduled L4 validator catalog.

Execution flow:

1. `RunL4ValidatorsUseCase` selects `L4-006` from the registry or explicit `validatorIds`.
2. `FileSystemSkillCatalogDriftAdapter` reads the current skill catalog and maintained documentation declarations.
3. `SkillCatalogDriftService` compares the actual count with documented totals and category totals.
4. Findings map to standard `ValidationResultContract.errors[]` with code `L4-006`.

## Maintained Sources

The first automated guardrail checks only intentionally maintained skill-count declarations:

- `skills/README.md`
- `README.md`
- `DEVELOPMENT.md`
- `docs/guide/installation.md`
- `docs/guide/quick-vs-full-mode.md`
- `docs/guide/skills-overview.md`

Historical inception/product docs are not checked because they preserve past design states and would create noise.

## Manual Remainder

The release checklist documents command/script drift and install target drift as manual checks until separate automated validators are added.
