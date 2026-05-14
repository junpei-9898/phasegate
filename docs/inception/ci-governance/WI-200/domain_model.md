# WI-200 Domain Model

@story-id H12-04
## Generate Template Options

`GenerateTemplateOptions` は `ci:generate-template` が受け付ける public CLI options の閉じた集合。

| Option | Status | Meaning |
|---|---|---|
| `--preset <id>` | supported | Template preset |
| `--type <type>` | supported | Template purpose |
| `--render` | supported | Render content to stdout |
| `--json` | supported | Return structured output |
| `--output <path>` | undecided | Either supported as file output or rejected as unknown |
| `--kind <type>` | unsupported unless explicitly aliased | Stale docs compatibility candidate |

## Unknown Option

Unknown option は user input error であり、fallback to default template をしてはならない。

## Invariants

- Invalid option names never alter template selection silently.
- Success output is only used when an actual render, JSON payload, or file write has occurred.
- Option validation happens before template generation.
