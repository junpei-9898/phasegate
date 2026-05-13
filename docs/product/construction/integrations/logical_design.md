# 論理設計: integrations

## WI-092 Validator-System Integration Wiring

<!-- @work-item-id WI-092 -->
@story-id H09-01
Integration entry points that invoke validator-system construct modules with resolved project configuration. This keeps hook and CLI validation behavior aligned with layer enablement and path settings from `phasegate.config.json`.

<!-- @work-item-id WI-163 -->
## WI-163 CI And Validator Integration Boundary

Integrations pass resolved config into validator-system and preserve skipped L4 results when standard preset disables L4. They do not hard-code the live validator registry or mutate generated workflow templates. `p2:*` compatibility commands may still route to phase2-extensions, but canonical L4 validation integration is `validate --layer L4` through validator-system.
