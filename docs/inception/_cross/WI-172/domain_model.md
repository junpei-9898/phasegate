---
traceability:
  initial_creation: true
---

# WI-172 Domain Model

| Concept | Meaning |
|---|---|
| SetupIntent | `minimal`, `recommended`, `strict`, `ci-only`, `agent-hooks`, or `retrofit`. |
| DetectedSetupState | Presence of package/config/hook/context/Husky/CI artifacts in the repository. |
| SetupPlan | Questions, changes, risks, rollback, and validation commands derived from intent and detected state. |
| SetupApplyResult | Structured install/bootstrap result returned only when `--apply` is used. |
