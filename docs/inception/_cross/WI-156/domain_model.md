---
traceability:
  initial_creation: true
---

# WI-156 Domain Model

## Scope Decision

WI-156 implements the first documentation drift guardrail as `L4-006 skill-catalog-drift`.

## Concepts

| Concept | Type | Description |
|---|---|---|
| SkillCatalogSnapshot | Value object | Current repository skill catalog derived from `skills/*/SKILL.md`. |
| SkillCountDeclaration | Value object | A documented skill count declaration in maintained public/operator docs. |
| SkillCategoryDeclaration | Value object | `docs/guide/skills-overview.md` category heading count, such as `Foundation (4 skills)`. |
| SkillCatalogDriftReport | Value object | Drift findings comparing actual skill count with documented count declarations and category totals. |
| SkillCatalogDriftService | Domain service | Converts a snapshot and declarations into actionable L4 findings. |

## Invariants

- The actual skill count is the number of first-level directories under `skills/` that contain `SKILL.md`.
- Maintained docs may declare the total skill count, but every declared total must equal the actual count.
- The sum of category heading counts in `docs/guide/skills-overview.md` must equal the actual count when those headings are present.
- Findings are warning-level L4 scheduled findings by default; strict fail-on-warning decides whether they block a run.

## Out Of Scope

- Command/script drift remains manual for this WI.
- Install target registry drift remains manual for this WI.
- Initial creation expiration public contract is deferred to WI-170 decision.
