# WI-210 Unit Test Design

## Installation Application Checks

| Case | Expected result |
|---|---|
| Skills symlink points to `../skills` but target has no `SKILL.md` or `.harness-version` | Doctor check returns red mechanical finding. |
| Real personal skill directory contains `.harness-version` | Doctor check remains green. |
| Symlink target contains bundled `SKILL.md` files | Doctor check remains green. |

## Manifest Safety

| Case | Expected result |
|---|---|
| Project install deploys shared skills | Manifest records `skills/.harness-version` and individual `skills/<name>` entries, not root `skills/` only. |
| Uninstall after user adds `skills/user-owned/SKILL.md` | Managed skills are removed and user-owned skill remains. |

