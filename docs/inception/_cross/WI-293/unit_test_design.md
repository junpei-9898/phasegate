# WI-293 Unit Test Design: WCR-001〜008

<!-- @work-item-id WI-293 -->

全testはdomain実体を用い、mockを使わない。日本語名とAAAを必須とする。

| ID | Case | Expected |
|---|---|---|
| UT-WI293-REC-001 | valid record | rule IDをcanonical sortしpin / provenanceを保持 |
| UT-WI293-REC-002 | invalid fact / rule / schema / provenance | record生成を拒否 |
| UT-WI293-PIN-001 | valid node/digest | immutable canonical projection |
| UT-WI293-CHG-001 | shuffled candidates | canonical tuple順へsort |
| UT-WI293-WCR-001 | malformed declaration | WCR-001だけ、partial recordなし |
| UT-WI293-WCR-002 | baselineなしmissing | WCR-002、WCR-003 / 008なし |
| UT-WI293-WCR-003 | baseline exact/current missing | WCR-003、WCR-002 / 008なし |
| UT-WI293-WCR-004 | invalid explicit alias | WCR-004 |
| UT-WI293-WCR-005 | exact / alias target duplicate | WCR-005、winnerなし |
| UT-WI293-WCR-006 | references / refines relation不在 | WCR-006 |
| UT-WI293-WCR-007 | depends-on relation不在 | WCR-007 |
| UT-WI293-WCR-008 | claimant / premise pin drift | endpoint別WCR-008 |
| UT-WI293-WCR-009 | content-equals current digest差 | WCR-008 |
| UT-WI293-MUT-001 | claimantだけ変更 | 同一constraintを再評価 |
| UT-WI293-MUT-002 | premiseだけ変更 | 同一constraintを再評価 |
| UT-WI293-MUT-003 | aliasなしpath rename | removed + added、WCR-004なし |
| UT-WI293-MUT-004 | valid alias | resolved-via-alias |
| UT-WI293-MUT-005 | explicit refines | relationありだけPASS、reflects相当edgeは非採用 |
| UT-WI293-MUT-006 | incremental evaluation | full evaluationとcanonical bytes一致 |
