# WI-192 Domain Model

## Concepts

- **Cascade update target**: A file path resolved from configured cascade patterns and tagged with a story/work-item marker.
- **Dry-run**: A preview execution that may compute target changes but may not mutate the filesystem.

## Invariants

- `dryRun=true` never calls the file write port.
- Human dry-run output uses preview wording.
- JSON dry-run output includes `dryRun: true`.
