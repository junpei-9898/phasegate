# WI-306 Unit Test Design

<!-- @work-item-id WI-306 -->

| ID | Case | Expected |
|---|---|---|
| UT-WI306-DOM-001 | v1 root absent | create / seal成功、従来canonical digest |
| UT-WI306-DOM-002 | v2 valid root | rootをcanonical payloadへ含める |
| UT-WI306-DOM-003 | rootだけを変更 | attestationDigestが変わる |
| UT-WI306-MAP-001 | v1 round-trip | rootなしで等値 |
| UT-WI306-MAP-002 | v2 round-trip | root保持、plain DTO |
| UT-WI306-MAP-003 | version / predicate / root mismatch | L1-053で拒否 |
| UT-WI306-UC-001 | providerなし | v1 produce |
| UT-WI306-UC-002 | providerあり | v2 produce、fragment digest fieldなし |
| UT-WI306-UC-003 | provider failure / invalid digest | writeなし、exit 2 |
| UT-WI306-FACADE-001 | current Snapshot | plain `worldSnapshotRoot` DTO |
| UT-WI306-PROJ-001 | v2 attestation projection | root差でWorld digest不変 |

テスト名は日本語、AAAとする。domain testは実valueを使いmockしない。application portには決定的fake providerを用いる。
