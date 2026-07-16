# WI-292 Unit Test Design: Coverage lifecycle

<!-- @work-item-id WI-292 -->

## Parser / generator

| ID | 条件 | 期待 |
|---|---|---|
| UT-WI292-P-001 | metadata省略 | required / [required] |
| UT-WI292-P-002 | planned明示 | planned / [planned] |
| UT-WI292-P-003 | planned -> required | required / [planned, required] |
| UT-WI292-P-004 | required -> planned | fail-closed |
| UT-WI292-P-005 | status/history不一致・duplicate | fail-closed |
| UT-WI292-G-001 | planned Story | matrix 1.2にACとstatusを保持 |

## L3-004

| ID | 条件 | 期待 |
|---|---|---|
| UT-WI292-L3-001 | required全AC covered | PASS |
| UT-WI292-L3-002 | required未カバー | AC単位FAIL |
| UT-WI292-L3-003 | planned refなし | PASS |
| UT-WI292-L3-004 | planned refあり | transition漏れFAIL |
| UT-WI292-L3-005 | reverse / mismatch lifecycle | lifecycle FAIL |
| UT-WI292-L3-006 | legacy fieldなし | requiredとして評価 |

## World

| ID | 条件 | 期待 |
|---|---|---|
| UT-WI292-WM-001 | matrix 1.2 | status / lifecycleをfactへ含める |
| UT-WI292-WM-002 | matrix 1.1 | requiredへ正規化 |
| UT-WI292-WM-003 | status差 | semantic digestが変わる |
