# WI-132 Logical Design

@work-item-id WI-132

`validator-system` owns `ContractTraceabilityCoverageService`. It accepts extracted semantic models through `ContractTraceabilityPolicyPort` and reports L2-015 findings.

Flow:

1. L2 runner selects `L2-015`.
2. `ContractTraceabilityPolicyPort.collect(targetPaths)` returns opt-in contract and observation records.
3. `ContractTraceabilityCoverageService.check()` verifies `PublicContract.requiredBehaviors` and Port adapter contract observations.
4. Findings are mapped to `ValidationResult` errors with code `L2-015`.
