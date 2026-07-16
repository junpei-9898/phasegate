# WI-298 Unit Test Design

<!-- @work-item-id WI-298 -->

| ID | Case | Expected |
|---|---|---|
| UT-WI298-INV-001 | fingerprint inventory sort / unique | fingerprint順、重複0 |
| UT-WI298-ADM-001 | current setとbaseline exact equality | added / missing entry 0 |
| UT-WI298-DEBT-001 | explicit debt projection | structural obligationと別collection |

既存baseline mapper / obligation classification unit testを再利用し、本WIの主要証明は実corpus smokeへ置く。

