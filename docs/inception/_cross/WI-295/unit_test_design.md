# WI-295 Unit Test Design: Fingerprint and policy derivation

<!-- @work-item-id WI-295 -->

全testは日本語名、semantic AAA、domain実体を用いる。hash portは既存規約に従う決定的test implementationを使う。

| ID | Case | Expected |
|---|---|---|
| UT-WI295-FP-001 | same semantic finding | byte-identical preimage / fingerprint |
| UT-WI295-FP-002 | locator / message / evaluation IDだけ変更 | fingerprint不変 |
| UT-WI295-FP-003 | observed digest / candidate multiset変更 | fingerprint変更 |
| UT-WI295-FP-004 | claimant / premise / both / declaration finding | subjectとpinをrule別projection |
| UT-WI295-POL-001 | waiver 0件、date指定あり | date nullのstable digest |
| UT-WI295-POL-002 | waiverあり、date / declaration順変更 | date差はdigest差、順序差は不変 |
| UT-WI295-POL-003 | waiverありdate欠落 / invalid | fail-closed |
| UT-WI295-OBL-001 | baselineとcurrentのintersection / difference | adopted / new / repaid |
| UT-WI295-OBL-002 | active exact waiver | waived、理由 / WI / expiry保持 |
| UT-WI295-OBL-003 | exclusive expiry boundary | 元分類 + expired diagnostic |
| UT-WI295-OBL-004 | WCR-001にwaiver / baseline candidate | invalid-declarationを維持 |
| UT-WI295-OBL-005 | ruleset mismatch | baseline非適用 + migration diagnostic |
| UT-WI295-OBL-006 | semantic debt併存 | structuralと別collection |
| UT-WI295-DET-001 | finding / policy input順変更 | report canonical bytes一致 |
| UT-WI295-APP-001 | invalid repository result | report / digestなし |
| UT-WI295-APP-002 | pure / write mode |同一report bytes、pureはwriter未呼出 |
