---
id: WI-124
type: issue
status: drafted
---

# WI-124 Logical Design: CI template validator registry synchronization

## Scope

CI template generation must not use a hard-coded stub validator list. `ci-governance` reads validator IDs from the validator-system registry and filters them by preset/template policy.

## Selection Rules

- `minimal`: L2/L3/L4 validators are omitted from CI target metadata.
- `standard`: L2 and L3 validators are included; L4 validators are included for `consistency-check` scheduled templates as opt-in scheduled audit metadata.
- `strict`: L2, L3, and L4 validators are included.
- `strictOnly` validators are included only for `strict`, except L4 scheduled metadata keeps the full L4 surface visible in `consistency-check`.
- L4 warning/advisory policy is represented by `failOnWarning=false` for non-strict presets and `true` for strict.

## Integration

`ValidatorIdRegistryPort` supports `listForPreset(presetId, templateType)` while retaining `listAll()` for compatibility. The default adapter imports validator-system's registry factory and derives the live IDs.

@work-item-id WI-124
