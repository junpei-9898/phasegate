# WI-113 Logical Design

## Scope

`validate --format json` is not part of the validate command contract. The supported formats are `human`, `agent`, and `ci`.

## Design

The CLI parser rejects unsupported validate formats before invoking validator execution. This prevents automation from receiving human output after requesting JSON.

`RunValidatorsHandler` accepts only the supported presentation formats. Format validation happens at the CLI boundary so every layer selection follows the same fail-fast path.

## Error Contract

Unsupported format values return a clear stderr message and non-zero exit. `json` is intentionally treated as unsupported until a real validate JSON schema is designed for every layer.

