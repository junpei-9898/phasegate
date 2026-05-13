# WI-180 Coverage Report

<!-- @work-item-id WI-180 -->

## Planned Coverage

| Requirement | Coverage |
|---|---|
| Scoped-out findings cannot be mistaken for current-scope repair work | Doctor integration tests assert `currentScopeRepairTarget: false` and only-if-selected repair applicability fields. |
| Applicable findings retain actionable repair guidance | Doctor integration tests assert default full-scope findings expose `currentScopeRepairTarget: true` and keep repair hints. |
| Human output identifies scoped-out checks | Doctor integration tests assert the scoped-out summary includes the check ID list and not-repair-target wording. |
| Agent guidance reads effective repair fields | CLI reference, troubleshooting, and bundled guidance skills document the new fields. |

## Dogfood

After publish, install the new package into a fresh project, run Claude-only setup, then verify both `phasegate doctor --agent claude --json` and human output.
