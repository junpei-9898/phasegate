# WI-134 Domain Model

<!-- @work-item-id WI-134 -->

- `EffectCapability`: semantic side effect category extracted from source.
- `CapabilityPolicy`: allowed and denied capabilities per architecture zone.
- `ArchitectureZone`: preset-specific layer/zone name.
- `CapabilityFinding`: denied capability, file zone, evidence, and suggested boundary.
- `ArchitectureSemanticSourcePort`: source adapter contract that returns file zone and extracted effects for `L4-002`.
