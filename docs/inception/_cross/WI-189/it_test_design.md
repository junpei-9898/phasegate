---
traceability:
  initial_creation: true
---

# WI-189 IT Test Design

## CLI E2E

Test file: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

Cases:

- `validate --layer L2 --format json` exits as a validation command, not a fatal parser error, and stdout is parseable JSON.
- `validate --layer L2 --json` follows the same JSON path.
- top-level help lists `check-change-category`.
- `scaffold-wi --help` and top-level help share `<unit|_cross> <story|issue|chore>`.
- `scaffold-design --help` documents `--dry-run|--apply`.
- `delegate-sonnet --help` documents forwarded positional args.

## Handler / Integration Tests

Test file: `scripts/harness/__tests__/integration/ci-governance/scaffold-design-handler.test.ts`

Cases:

- default mode is dry-run and does not call `DesignDocWriterPort.write()`.
- `--apply` writes and returns `written=true`.
- `--dry-run --apply` returns exit 2 and does not write.
- JSON output includes `dryRun`.

Test file: `scripts/harness/__tests__/unit/harness-api/pre-commit.test.ts`

Case:

- `runBypassAudit()` with an empty range says "No changed files in range" and does not mention staged files.

@work-item-id WI-189
