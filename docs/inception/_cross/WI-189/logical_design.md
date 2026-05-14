---
traceability:
  initial_creation: true
---

# WI-189 Logical Design

## CLI Parser Changes

`scripts/harness/main.ts` remains the CLI boundary for umbrella UX cleanup.

- Extend `parseValidateFormat()` to accept `json` and map it to the same render path as `ci`.
- In the `validate` command, global `--json` selects JSON output when `--format` is absent.
- Update `printUsage()` and `SUBCOMMAND_HELP` so top-level signatures and detailed usage share the same positional contracts.
- Add explicit help for `scaffold-design` and `delegate-sonnet`.

## Scaffold Design Mode

`ScaffoldDesignHandler` receives `dryRun` and `apply` flags from `main.ts`. It validates conflict cases before calling the use case.

The use case receives `dryRun` and skips `writer.write()` when true. The output keeps the existing target/template metadata and adds a `dryRun` boolean so JSON consumers can distinguish a preview from a write. In dry-run mode `written=false` even when the target does not exist.

## Bypass Audit Wording

`runBypassAudit()` calls `runPreCommit()` with changed files from the audited range. Because `runPreCommit()` owns staged-file wording for the native pre-commit path, `runBypassAudit()` rewrites the empty-range message at the range boundary instead of changing pre-commit behavior globally.

## Compatibility

`validate --format ci` output remains unchanged. `validate --format json` and `validate --json` reuse that JSON payload.

`scaffold-design --apply` preserves the prior write behavior. Running the command without `--apply` becomes a dry-run preview; this is a deliberate safety correction for a write-side public command.

@work-item-id WI-189
