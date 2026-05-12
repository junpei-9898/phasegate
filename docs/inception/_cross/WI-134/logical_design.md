# WI-134 Logical Design

<!-- @work-item-id WI-134 -->

Side-effect capability boundaries are separate from import dependency boundaries. Architecture presets define zones, while capability policy defines which semantic effects each zone may use directly.

## Design

- `EffectCapability` covers filesystem, network, database, process-env, time, random, subprocess, and user-io.
- Presets expose `capabilityPolicies` beside dependency policies.
- Clean/domain zones deny direct effects; infrastructure/adapter zones allow integration effects.
- Layered/MVC/vertical-slice presets can express different policy shapes without changing validator code.
- `L4-002` invokes architecture semantic analysis after dependency consistency checks and emits warning findings when observed effects violate the preset policy.
- Findings include file path, observed zone, denied capability, evidence, and suggested infrastructure/adapter boundary.
