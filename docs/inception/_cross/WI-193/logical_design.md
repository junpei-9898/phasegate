# WI-193 Logical Design

## Scope

`doctor` should report the real size of `_shared` ad-hoc inception drift, including nested markdown files, while preserving the manual/no-repair contract from WI-187.

## Design

- Treat every `docs/inception/_shared/**/*.md` file as an ad-hoc plan candidate when no WI directories exist.
- Continue excluding files under `WI-XXX` directories.
- Keep `repairMode: "manual"` and `repairHint: null`.

## Verification

- Unit regression covers mixed top-level and nested `_shared` markdown files and verifies the reported count.
