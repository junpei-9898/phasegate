# WI-195 Logical Design

## Scope

`migrate work-items` remains an invocable public command and should be visible in main and command help without being advertised as an automatic doctor repair.

## Design

- Add `migrate work-items` to the main help command list.
- Update `migrate` subcommand help to mention both config schema migration and legacy inception work item migration, including `--dry-run|--apply`.
- Keep doctor `repairHint` for `_shared` drift as `null`.

## Verification

- CLI E2E help test checks for `migrate work-items`.
