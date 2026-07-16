# WI-294 Unit Test Design: Declaration admission

<!-- @work-item-id WI-294 -->

全testは日本語名、semantic AAA、domain実体を用いる。filesystemはunit testでmockせず、mapperをpure inputで検証する。

| ID | Case | Expected |
|---|---|---|
| UT-WI294-CON-001 | valid constraint declaration | sorted rule IDを持つConstraintRecordとexplicit relationへ変換 |
| UT-WI294-CON-002 | malformed supported record | partial recordなし、WCR-001 inputとlossless reason |
| UT-WI294-CON-003 | duplicate constraint ID | 全candidate no-winner、各candidateがmalformed |
| UT-WI294-CON-004 | duplicate alias source | alias winnerなし、diagnostic保持 |
| UT-WI294-BAS-001 | valid baseline | required provenanceとsorted entryを保持 |
| UT-WI294-BAS-002 | duplicate fingerprint | invalid、entry winnerなし |
| UT-WI294-WAI-001 | valid waiver set | ID / fingerprint順でdeterministic sort |
| UT-WI294-WAI-002 | invalid expiry / WI / renewal | invalid |
| UT-WI294-WAI-003 | duplicate waiver ID / fingerprint | invalid、winnerなし |
| UT-WI294-DEB-001 | valid semantic debt | sorted World node referencesを保持 |
| UT-WI294-DEB-002 | non-semantic kind / duplicate ID | invalid |
| UT-WI294-DET-001 | declaration array順を変更 | canonical projection一致 |
