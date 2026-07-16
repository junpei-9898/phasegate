# WI-301 Integration Test Design

<!-- @work-item-id WI-301 -->

| ID | Scenario | Expected |
|---|---|---|
| IT-WI301-REG-001 | default registry golden | L2-017が一意、L3-008は未登録 |
| IT-WI301-RUN-001 | world disabled RunL2 | 8 results、L2-017 skipped、port未実行 |
| IT-WI301-RUN-002 | world enabled clean observation | L2-017 pass |
| IT-WI301-RUN-003 | malformed constraint fixture | WCR-001相当error、fail-closed |
| IT-WI301-RUN-004 | new pin / unpinned claim fixture | new structural / invalid declaration error |
| IT-WI301-RUN-005 | adopted legacy fixture | warning result、default aggregationはPASS |
| IT-WI301-ADAPTER-001 | world public facade adapter | generated reportを書かずplain observationへ変換 |

fixtureはfingerprint / rule / classificationをexact assertし、HarnessErrorには`local fast-path`と`authoritative L3`の両方を要求する。
