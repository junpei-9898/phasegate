---
traceability:
  initial_creation: true
---

# WI-184 IT Test Design: skill catalog CLI

<!-- @work-item-id WI-184 -->

| Case | Scenario | Evidence |
| --- | --- | --- |
| IT-WI184-001 | Published help command `phasegate skills list` exits 0 and lists available skills including guidance skills. | `scripts/harness/__tests__/e2e/cli-harness.test.ts` invokes `skills list` and asserts exit 0 plus `/phasegate-config-doctor`. |
| IT-WI184-002 | Empty skill catalog does not crash through an undefined accumulator. | `scripts/harness/__tests__/unit/setup/skill-deployer.test.ts` calls `listAvailableSkillNames()` against a temp root without `skills/` and expects `[]`. |
| IT-WI184-003 | `skills list` and `skills info <name>` share the `skills/<name>/SKILL.md` source rule. | `scripts/harness/__tests__/unit/setup/skill-deployer.test.ts` creates one temp `SKILL.md`, asserts list output, and checks `getSkillMarkdownPath()`. |
