---
id: WI-128
type: issue
status: drafted
---

# WI-128 Test Design

| ID | Target | Scenario | Expected |
| --- | --- | --- | --- |
| DOC-WI128-001 | README / README.ja | known limitations | WI-128 is named as L4 operational rollout scope |
| DOC-WI128-002 | `docs/guide/layer-model.md` | L4 section | cron, command, preset, and advisory policy are present |
| IT-WI128-001 | CLI | `validate --layer L4` with disabled L4 | explicit execution runs L4 rather than reporting disabled skip |
| IT-WI128-002 | CLI | `phasegate:ci-check` with disabled L4 | L4 skip is reported as disabled scheduled layer |
| IT-WI128-003 | CLI | `p2:*` docs | compatibility role is documented |

@work-item-id WI-128
