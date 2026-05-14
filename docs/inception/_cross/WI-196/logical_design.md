# WI-196 Logical Design

## Scope

`delegate-sonnet [...args]` should match its help text by accepting positional task text as forwarded prompt input.

## Design

- Keep PhaseGate CLI pass-through behavior for `delegate-sonnet`.
- Update `scripts/delegate-sonnet.sh` to treat non-option positional arguments, including after `--`, as prompt text.
- Provide a default output path when positional prompt shorthand is used without `--output`, preserving explicit `--output` support.

## Verification

- CLI E2E regression runs `delegate-sonnet "test task" --dry-run` and verifies the prompt is accepted without `Unknown option`.
