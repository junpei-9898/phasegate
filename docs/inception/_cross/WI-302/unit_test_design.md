# WI-302 Unit Test Design

<!-- @work-item-id WI-302 -->

| ID | Case | Expected |
|---|---|---|
| UT-WI302-ID-001 | `L3-008` create / name lookup | `world-constraint-rederivation` |
| UT-WI302-POL-001 | new structural obligation | error、rule / fingerprint保持 |
| UT-WI302-POL-002 | invalid declaration | error、non-adoptable表現 |
| UT-WI302-POL-003 | adopted legacy | warning、blockingへ昇格しない |
| UT-WI302-POL-004 | active waiver | warning、可視性維持 |
| UT-WI302-POL-005 | derive diagnostic | authoritative判定不能としてerror |
| UT-WI302-POL-006 | input order差 | deterministic order |
| UT-WI302-CFG-001 | world disabled / enabled | L3-008 exclude / include |

テスト名は日本語、semantic AAAとし、domain serviceはplain observation実体で検証してmockしない。
