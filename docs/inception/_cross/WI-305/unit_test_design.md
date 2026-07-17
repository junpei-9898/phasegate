# WI-305 Unit Test Design

<!-- @work-item-id WI-305 -->

| ID | Case | Expected |
|---|---|---|
| UT-WI305-POL-001 | World disabled | provider未実行、skipped |
| UT-WI305-POL-002 | pin済みfragment + matching WI trailer | pass |
| UT-WI305-POL-003 | pin済みfragment + trailerなし / mismatch | non-bypassable failure |
| UT-WI305-POL-004 | unpinned fragment | findingなし |
| UT-WI305-POL-005 | provider unavailable | fixed code warning、non-blocking |
| UT-WI305-POL-006 | claimant / premise両方と複数fragment | role + keyでendpoint-symmetric、stable sort |
| UT-WI305-TRACE-001 | marker / Work Item / reflection | plain DTOへlossless projection |
| UT-WI305-WORLD-001 | supported constraint pins | public facadeがexplicit fragment endpointだけを投影 |

テスト名は日本語、AAAとする。domain serviceはplain inputを直接評価し、domain objectをmockしない。application testのproviderは決定的fakeを用いる。
