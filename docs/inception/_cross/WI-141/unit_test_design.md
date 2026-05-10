<!-- @work-item-id WI-141 -->

# WI-141 Unit Test Design: Bypass Audit

## Harness API Tests

| Case | Input | Expected |
|---|---|---|
| WI141-UT-001 | Commit message contains `Bypass-Reason` only | Validation fails and reports the missing bypass trailers. |
| WI141-UT-002 | Commit message contains all required bypass trailers with `command:<command>` evidence | Trailer validation passes. |
| WI141-UT-003 | Commit message contains `Bypass-Evidence: report:<missing-path>` | Validation fails with missing evidence report. |
| WI141-UT-004 | Pre-commit validation fails with `L2-003` and bypass trailers are present | Bypass is rejected as non-bypassable. |
| WI141-UT-005 | Pre-commit validation fails with `L2-001` and bypass trailers are present | Bypass is accepted as conditional. |
| WI141-UT-006 | `bypass:audit` sees failing validation without bypass trailers | Audit fails as missing bypass evidence. |
| WI141-UT-007 | `bypass:audit` sees failing validation with complete trailers and only conditional blockers | Audit passes with a bypass report. |

## CLI Integration Tests

| Case | Input | Expected |
|---|---|---|
| WI141-IT-001 | `commit-msg` with partial bypass trailers | Exit 1 and message identifies required trailers. |
| WI141-IT-002 | `bypass:audit --base <ref>` in a clean range | Exit 0. |
