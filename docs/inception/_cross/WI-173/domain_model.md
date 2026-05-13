---
traceability:
  initial_creation: true
---

# WI-173 Domain Model

| Concept | Meaning |
|---|---|
| ConfigChangeIntent | A stable planner intent such as `l4-strict`, `codex-hooks`, or `quick-mode-strict`. |
| ChangeTarget | Config path, managed artifact, or user-level setting affected by the intent. |
| ChangePlan | Commands, risks, diff explanation, rollback, and validation steps for agent approval. |
