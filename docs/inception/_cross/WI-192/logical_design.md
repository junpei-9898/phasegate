# WI-192 Logical Design

## Scope

`skill:apply-cascade-update --dry-run` must be a safe preview and must communicate preview semantics in both human and JSON output.

## Design

- Keep the application use case from writing when `dryRun` is true.
- Avoid no-op writes when target content already contains the story tag.
- Add handler-level JSON output with a `dryRun` boolean.
- Change human dry-run wording from `Updated` to `Would update`.

## Verification

- Use-case regression asserts dry-run reads targets but never calls `FileSystemPort.write`.
- Handler regression asserts preview wording and JSON structure.
