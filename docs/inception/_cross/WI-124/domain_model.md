---
id: WI-124
type: issue
status: drafted
---

# WI-124 Domain Model

| Concept | Owner | Meaning |
| --- | --- | --- |
| `ValidatorIdRegistryPort` | ci-governance | Port used by CI template generation to query validator IDs. |
| `ValidatorRegistry` | validator-system | Source of validator definitions and IDs. |
| `TemplateConfig.targetValidatorIds` | ci-governance | The validator metadata set attached to generated template summaries. |
| Preset-aware selection | ci-governance | Filter from live registry according to `minimal` / `standard` / `strict` and template type. |

## Invariants

- CI template generation must not depend on stub validator IDs.
- `listAll()` returns live validator-system IDs.
- `listForPreset()` preserves L4 scheduled audit visibility for `consistency-check`.
- Strict-only validators are visible only in strict preset, except scheduled L4 audit metadata.

@work-item-id WI-124
