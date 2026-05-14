---
traceability:
  initial_creation: true
---

# WI-189 Domain Model

## Command UX Contract

WI-189 treats public CLI consistency as a contract between three observable surfaces:

- main help: the top-level command catalog and one-line command signature.
- subcommand help: the detailed usage, supported options, examples, and write-mode semantics.
- command execution: the actual parser and side-effect behavior.

The same command must not advertise a flag, positional argument, or write behavior that execution rejects or silently changes.

## Affected Concepts

### Output Format Alias

`validate --format json` is a compatibility alias for the existing CI JSON formatter. It must not fatal while the global `--json` flag exists. `validate --json` also selects the same JSON contract unless a more specific `--format` is supplied.

### Write Mode

`scaffold-design` is a write-side command. Its mode is explicit:

- `--dry-run` previews the target and template without writing.
- `--apply` writes the scaffold.
- no mode defaults to dry-run, matching install/reconcile-style setup commands.
- `--dry-run --apply` is invalid.

### Range No-op Message

`bypass:audit --base <ref> --head <ref>` audits changed files in a commit range, not staged files. When the audited range is empty, the no-op message must say "No changed files in range" so users do not confuse it with pre-commit staged-file behavior.

### Help Signature Consistency

`scaffold-wi`, `scaffold-design`, `check-change-category`, and `delegate-sonnet` must have consistent top-level and subcommand help. Hidden commands recommended by `config:plan` must appear in main help.

@work-item-id WI-189
