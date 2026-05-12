# WI-112 Domain Model

## Concepts

| Concept | Owner | Meaning |
|---|---|---|
| `LayerHealth` | harness-api | Per-layer health summary with separate configuration, cached artifact, and live validation states. |
| `HarnessStatusSummary` | harness-api | Command output aggregate for `phasegate:status`. |
| `ValidationResult` | validator-system | Live validator result consumed by status derivation. |

## Invariants

- `configurationState=disabled` means configuration disabled the layer, not that validation was skipped due to missing artifacts.
- `cachedArtifactState=missing` means no cached evidence was found on disk.
- `liveValidationState=not-run` means status has no live validation observation.
- `lastResult` is a compatibility summary. Live pass/fail wins over cached artifact state; otherwise missing cached artifacts become `unknown`.

