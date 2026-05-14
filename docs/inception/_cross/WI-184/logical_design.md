---
traceability:
  initial_creation: true
---

# WI-184 Logical Design: skill catalog CLI

<!-- @work-item-id WI-184 -->

## Flow

1. `phasegate skills list` calls `listAvailableSkillNames(harnessRoot)`.
2. The helper scans `skills/`, keeps only directories containing `SKILL.md`, sorts names, and returns `[]` when the directory is absent.
3. The CLI groups names by `getCategoryForSkill(name) ?? "unknown"`.
4. The grouped output renders `core`, `aidlc`, `utility`, `guidance`, and `unknown`.
5. `phasegate skills info <name>` calls `getSkillMarkdownPath(harnessRoot, name)` and reads the same catalog file location.

## Change Set

- Add `listAvailableSkillNames()` and `getSkillMarkdownPath()` to `scripts/harness/setup/skill-deployer.ts`.
- Update `scripts/harness/main.ts` to use the shared helpers and include a `guidance` accumulator bucket.
- Add regression coverage for real CLI list output and for empty catalog helper behavior.
