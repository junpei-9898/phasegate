# WI-297 Integration / E2E Test Design

<!-- @work-item-id WI-297 -->

| ID | Mutation | Expected |
|---|---|---|
| IT-WI297-BASE-001 | base corpus | obligation 0、exit 0 |
| IT-WI297-WCR-002 | baselineにないmissing endpoint | WCR-002、new-structural、exit 1 |
| IT-WI297-WCR-003A | legacy Fragment削除 | WCR-003、new-structural、exit 1 |
| IT-WI297-WCR-003B | aliasなしlegacy Fragment rename | WCR-003、old removed + new added、exit 1 |
| IT-WI297-ALIAS-OK | valid single-hop alias | resolved-via-alias、obligation 0、exit 0 |
| IT-WI297-WCR-004 | invalid alias target / chain | WCR-004、exit 1 |
| IT-WI297-WCR-005 | duplicate World node ID | duplicate diagnostic + WCR-005、exit 1 |
| IT-WI297-WCR-008A | claimant content drift | claimant WCR-008、exit 1 |
| IT-WI297-WCR-008B | premise content drift | premise WCR-008、exit 1 |
| IT-WI297-MATRIX-001 | matrix TestReference除去 | stale endpoint WCR-003、exit 1 |
| IT-WI297-DECL-001 | supported malformed constraint | WCR-001、invalid-declaration、exit 1 |
| IT-WI297-DECL-002 | unknown constraint schema | exit 2、reportなし |
| IT-WI297-DECL-003 | new missing constraint | WCR-002、new-structural、exit 1 |
| IT-WI297-CLAIM-001 | contentDigestなしのnew claim | WCR-001、invalid-declaration、exit 1 |
| IT-WI297-WVR-001 | expiresOn前日 / 当日 | waived exit 0 / expired exit 1、fingerprint同一 |
| IT-WI297-DET-001 | 同一fixture二重実行 | JSON byte-identical |
| IT-WI297-DET-002 | clean / stale `.harness` | pure result一致 |
| IT-WI297-DET-003 | report手編集 / 削除 | 再導出結果とexit不変 |

