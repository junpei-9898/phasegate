# WI-131 Unit Test Design

<!-- @work-item-id WI-131 -->

| ID | Target | Scenario | Expected |
|---|---|---|---|
| UT-NQ-INTENT-001 | EvaluateRequirementIntentCoverageUseCase | AC に test reference がある | `observed` |
| UT-NQ-INTENT-002 | EvaluateRequirementIntentCoverageUseCase | test reference はあるが testName が空 | `weakly-observed` |
| UT-NQ-INTENT-003 | EvaluateRequirementIntentCoverageUseCase | AC に test reference がない | `unobserved` |
| UT-NQ-INTENT-004 | EvaluateRequirementIntentCoverageUseCase | unknown story の test metadata がある | warning |
