# WI-216 Unit Test Design

<!-- @work-item-id WI-216 -->

## Planning And Checks

| Case | Expected result |
|---|---|
| Personal skills directory exists with `.harness-version` but lacks a selected bundled skill | Install plan is mechanical and changed. |
| Personal skills directory contains user-owned skill plus stale bundled skills | Install/reconcile refreshes bundled skills and keeps the user-owned skill. |
| Skills target contains only `.harness-version` | Doctor reports missing bundled skills instead of green. |
| Skills target contains required bundled `SKILL.md` files and matching metadata | Doctor reports green. |

## Manifest Safety

| Case | Expected result |
|---|---|
| Personal install deploys Claude skills | Manifest records `.claude/skills/.harness-version` and `.claude/skills/<skill>` entries. |
| Personal install deploys Codex skills | Manifest records `.codex/skills/.harness-version` and `.codex/skills/<skill>` entries. |
| Legacy manifest has `.claude/skills` as a created directory | Uninstall removes known bundled skills and metadata, then preserves user-owned skills. |

