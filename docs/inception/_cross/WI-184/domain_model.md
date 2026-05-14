---
traceability:
  initial_creation: true
---

# WI-184 Domain Model: skill catalog CLI

<!-- @work-item-id WI-184 -->

## Concepts

| Concept | Owner | Rule |
| --- | --- | --- |
| SkillCatalogEntry | harness-api/setup boundary | A directory under `skills/` is a catalog entry only when it contains `SKILL.md`. |
| SkillCategory | setup | `core`, `aidlc`, `utility`, and `guidance` are first-class categories returned by `getCategoryForSkill()`. Unknown catalog entries are rendered under `unknown`. |
| SkillMarkdownPath | setup | `skills info <name>` and `skills list` derive catalog membership from the same `skills/<name>/SKILL.md` path rule. |

## Invariants

- `skills list` must allocate an accumulator bucket for every `SkillCategory` value.
- Missing `skills/` is an empty catalog, not a fatal CLI error.
- Directory names without `SKILL.md` are ignored by list output and do not affect `skills info`.
