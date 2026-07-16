# WI-304 Integration Test Design

<!-- @work-item-id WI-304 -->

| ID | Scenario | Expected |
|---|---|---|
| IT-WI304-ADAPTER-001 | synthetic World rootをquery | public facade pure derive、plain result |
| IT-WI304-ADAPTER-002 | malformed control schema | unavailable、report fallbackなし |
| IT-WI304-HOOK-001 | world disabled project | World sectionなし、exit 0 |
| IT-WI304-HOOK-002 | mixed obligation fixture | priority / cap / omissionがcontractどおり |
| IT-WI304-HOOK-003 | derive failure | 固定一行warning、exit 0 |
| IT-WI304-DOGFOOD-001 | self-repo session-start | adopted legacy 604を件数一行、個別fingerprintなし |

hook E2EはCodex hook JSON schema、stdout単一JSON、stderr、exit 0を維持する。fixture由来prose / reason / full reportがadditionalContextへ現れないこともassertする。
