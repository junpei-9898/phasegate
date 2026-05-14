# WI-196 Domain Model

## Concepts

- **Forwarded delegate args**: Arguments after `delegate-sonnet` that belong to the delegated script, not PhaseGate's option parser.
- **Positional prompt shorthand**: Non-option text treated as delegate prompt content.

## Invariants

- Positional prompt text does not produce `Unknown option`.
- `--` marks the rest of the args as prompt text.
- `--prompt`, `--prompt-file`, and `--output` remain supported.
