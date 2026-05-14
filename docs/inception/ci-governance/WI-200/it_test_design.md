# WI-200 IT Test Design

@story-id H12-04
## Cases

| ID | Scenario | Command | Expected |
|---|---|---|---|
| IT-WI200-001 | stale `--kind` rejected | `ci:generate-template --kind consistency-check` | exit 2 and `Unknown option: --kind`, unless explicitly implemented as alias. |
| IT-WI200-002 | unsupported `--output` rejected or writes file | `ci:generate-template --type aidlc-gate --output <tmp>` | Either file exists with rendered YAML, or exit 2 with `Unknown option: --output`. |
| IT-WI200-003 | valid render still works | `ci:generate-template --type consistency-check --render` | consistency-check YAML begins with expected workflow header. |
| IT-WI200-004 | no destination is not misleading | `ci:generate-template --type aidlc-gate` | human output does not claim a file/template was generated unless content is emitted. |

## Regression Guard

Extend CLI e2e harness tests so every supported command with a closed option set rejects unknown `--*` arguments consistently.
