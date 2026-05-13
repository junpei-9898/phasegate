---
traceability:
  initial_creation: true
---

# WI-172 Unit Test Design

| Case | Expected behavior |
|---|---|
| Recommended dry-run | Emits detected state and questions without writes. |
| Strict dry-run | Includes CI/Husky changes and validation commands. |
| Apply | Bootstraps skills/config/package and delegates managed files to install use case. |
