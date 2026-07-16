# WI-302 Integration Test Design

<!-- @work-item-id WI-302 -->

| ID | Scenario | Expected |
|---|---|---|
| IT-WI302-REG-001 | default registry golden | L3-008が一意、L3 catalogは8件 |
| IT-WI302-RUN-001 | world disabled RunL3 | L3-008 skipped、port未実行 |
| IT-WI302-RUN-002 | world enabled base fixture | L3-008 pass |
| IT-WI302-RUN-003 | new unpinned claim / duplicate fixture | 期待WCR / fingerprintでfail-closed |
| IT-WI302-RUN-004 | adopted legacy / active waiver fixture | warning、既定集約はnon-blocking |
| IT-WI302-RUN-005 | unsupported schema | authoritative error、empty fallbackなし |
| IT-WI302-ADAPTER-001 | report absent / forged / deleted | observationとblocking結果が不変 |
| IT-WI302-DOGFOOD-001 | self-repo temporary world enabled | L2 / L3実測結果と所要時間を記録 |

fixtureはfingerprint / rule / classificationをexact assertし、HarnessErrorには`authoritative clean-corpus re-derivation`を要求する。
