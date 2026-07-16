# WI-297 Unit Test Design

<!-- @work-item-id WI-297 -->

| ID | Case | Expected |
|---|---|---|
| UT-WI297-CMP-001 | baseline Snapshot省略 | initial missingはWCR-002 |
| UT-WI297-CMP-002 | baseline Snapshot明示 | deleted endpointはWCR-003 |
| UT-WI297-CLK-001 | injected UTC date | 全waiverへ同じpolicy dateを適用 |

既存ConstraintEvaluator / obligation service unit testを再利用し、本WIの主検証はrepository-shaped E2Eへ置く。

