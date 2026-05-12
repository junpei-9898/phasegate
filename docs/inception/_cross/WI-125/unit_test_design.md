# WI-125 Unit Test Design

<!-- @work-item-id WI-125 -->

| ID | Target | Scenario | Expected |
|---|---|---|---|
| UT-NQ-GEN-001 | GenerateRequirementTestMatrixUseCase | AC と `@story` 付き test がある | schema 互換 matrix が生成される |
| UT-NQ-GEN-002 | GenerateRequirementTestMatrixUseCase | 既存 matrix に手動 test reference がある | reference が保持される |
| UT-NQ-GEN-003 | GenerateRequirementTestMatrixUseCase | AC に test がない | `missingTests` に出る |
| UT-NQ-GEN-004 | GenerateRequirementTestMatrixUseCase | docs にない story の test がある | `orphanTests` に出る |
| UT-NQ-GEN-005 | GenerateRequirementTestMatrixUseCase | `@work-item-id` のみの test がある | matrix には入れず report で説明する |
