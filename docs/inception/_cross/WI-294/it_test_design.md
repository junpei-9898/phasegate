# WI-294 Integration Test Design: Filesystem declaration repositories

<!-- @work-item-id WI-294 -->

fixtureをtemp project rootへcopyし、real filesystem、real JSON parser、published contract schema、domain mapperを統合して検証する。

| ID | Case | Expected |
|---|---|---|
| IT-WI294-REP-001 | 4 canonical fileが不在 | 各portが`absent` + canonical emptyを返す |
| IT-WI294-REP-002 | 4 valid fixture | `loaded` + domain declarationを返す |
| IT-WI294-REP-003 | schemaVersion欠落 / unknown | `invalid`、empty fallbackなし |
| IT-WI294-REP-004 | invalid JSON / UTF-8 / read failure | `invalid` diagnostic、throw / omissionなし |
| IT-WI294-REP-005 | supported constraints内malformed / duplicate | validだけadmit、invalid candidateはWCR-001入力、winnerなし |
| IT-WI294-REP-006 | duplicate policy ID / fingerprint | policy document `invalid`、candidate winnerなし |
| IT-WI294-REP-007 | atomic replace | temp fileを残さずcomplete canonical JSONだけを観測 |
| IT-WI294-REP-008 | ci-governance baseline shape | World baseline schemaに不適合、暗黙importなし |

H17-08 AC-1〜5はfixture testへ明示bindする。matrix regeneration後に全ACがrequired StoryとしてcoveredであることをL3-004で確認する。
