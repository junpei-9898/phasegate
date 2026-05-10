<!-- @work-item-id WI-141 -->

# WI-141 Logical Design: Bypass Audit Policy

## Scope

WI-141 adds a shared bypass audit path for Git hooks, agent hooks, and CI. The policy is owned by PhaseGate, not by Codex or Claude Code. Agent-specific hooks call the same CLI command and must not duplicate bypass rules.

## Command Surface

- `phasegate commit-msg <message-file>` validates normal `Work-Item` trailers and, when any bypass trailer is present, validates the complete bypass trailer set.
- `phasegate bypass:audit --base <ref>` is the push/CI backstop. It scans commits after `<ref>`, derives the changed paths, reruns the same L2/metadata checks over the affected current files, and decides whether a commit needed an explicit bypass record.
- `phasegate bypass:audit --head <ref>` can be used by CI to audit a non-`HEAD` tip.

## Bypass Contract

Required trailers when bypassing:

- `Bypass-Reason: <text>`
- `Bypass-Evidence: command:<command>` or `Bypass-Evidence: report:<path>`
- `Bypass-Owner: <name-or-team>`

Optional:

- `Bypass-Report: <path>`

`report:<path>` and `Bypass-Report` must point to an existing local file when audited locally. `command:<command>` must be non-empty and records the verification command that justified the bypass.

## Blocker Classification

Non-bypassable blocker classes:

- metadata validation failures
- test-quality failures
- work-item status staleness failures

Conditional bypass classes:

- known phase-gate artifact debt
- environment-dependent failures
- documented false positives with a report

If any non-bypassable blocker remains, bypass audit fails even when trailers are present.

## Push / CI Backstop

Git does not store whether `git commit --no-verify` was used. PhaseGate therefore detects bypass risk by replaying the gate for commits in the audited range:

1. Collect commits in `base..head`.
2. Collect changed files from the range.
3. Run the same pre-commit validation against those paths.
4. If validation passes, no bypass is required.
5. If validation fails and no complete bypass trailers exist on at least one audited commit, fail as missing bypass evidence.
6. If validation fails with non-bypassable blockers, fail even when trailers exist.

This catches the practical failure mode: a commit that could only have progressed by bypassing local gates reaches push/CI without a structured audit trail.
