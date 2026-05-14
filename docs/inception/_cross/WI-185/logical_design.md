# WI-185 Logical Design

## Scope

`p2:check-freshness` and `p2:validate-pointers` must resolve document patterns against the downstream project cwd, not the installed package location. The same scanner contract is shared with `p2:check-initial-creation`.

## Design

- `FileSystemDocumentScannerAdapter` remains the single project-root based scanner for phase2 document commands.
- CLI `--pattern` is treated as a scan override, not as a rule-id filter. Explicit glob and single-file paths are passed to the scanner directly.
- Default rules continue to come from config. When no `--pattern` is provided, each enabled rule scans its configured `documentPattern`.
- `p2:validate-pointers` accepts `--pattern` with the same semantics as freshness and initial-creation.

## Validation

- Integration tests create a downstream-like temp project with docs and run the real use cases/handlers against that temp root.
- Tests assert default pattern, explicit glob, and explicit single-file path all detect documents.
