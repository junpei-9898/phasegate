# WI-113 Domain Model

## Concepts

| Concept | Owner | Meaning |
|---|---|---|
| `ValidateFormat` | harness-api | CLI boundary value limited to `human`, `agent`, and `ci`. |
| `RunValidatorsHandlerArgs.format` | validator-system | Presentation selector for validator summary formatting. |

## Invariants

- `validate` must not silently coerce unsupported formats to human output.
- Supported format lists in help text, parser validation, and handler input stay aligned.
- A future JSON format must define one schema across L2, L3, L4, and all-layer output before being accepted.

