---
id: WI-123
type: issue
status: drafted
---

# WI-123 Logical Design: hook skip / baseline bypass visibility

## Scope

`phasegate:status --json` exposes operational transparency data that is separate from validator pass/fail:

- hook installation/enabled state
- latest observable hook skip state, grouped by hook type
- Codex native `apply_patch` pre-edit interception limitation
- baseline grandfather debt and sha mismatch count
- warnings and next actions when skip/bypass/debt is high

## Data Model

`HarnessStatusSummary` gains:

- `hookHealth`: enabled state, configured hook files, latest skip state, and `applyPatchBypass`
- `baselineHealth`: baseline enabled state, snapshot path, grandfathered file count, sha mismatch count, and removal rate
- `operationalWarnings`: warning code/message/nextAction triples

These fields are informational. They do not change layer `lastResult` or gate exit code.

## Status Derivation

`ConfigQueryPort` may provide operational health data. If unavailable, `phasegate:status` still renders the normal layer summary and returns conservative unknown/default values.

Baseline mismatch is computed by comparing snapshot sha1 entries to current files. Missing files count as relieved debt, not gate failure. Sha mismatch means the file left grandfather protection and should be brought under normal PhaseGate design coverage.

## Documentation

Public docs explain that native Codex `apply_patch` bypasses pre-edit hooks and is covered by the L2 pre-commit backstop.

@work-item-id WI-123
