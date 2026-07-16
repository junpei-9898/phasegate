# WI-301 Unit Test Design

<!-- @work-item-id WI-301 -->

| ID | Case | Expected |
|---|---|---|
| UT-WI301-ID-001 | `L2-017` create / name lookup | `world-constraint-admission` |
| UT-WI301-POL-001 | new pinのdigest / endpoint finding | error、fingerprint保持 |
| UT-WI301-POL-002 | unpinned / malformed claim | WCR-001 error、non-waivable表現 |
| UT-WI301-POL-003 | adopted legacy fixture | warning、blockingへ昇格しない |
| UT-WI301-POL-004 | active waiver | warning、reasonを隠さない |
| UT-WI301-POL-005 | valid addition / findingなし | findingなし |
| UT-WI301-POL-006 | input order差 | deterministic order |
| UT-WI301-CFG-001 | world disabled / enabled | L2-017 exclude / include |

テスト名は日本語、semantic AAAとし、domain serviceはplain observation実体で検証してmockしない。
