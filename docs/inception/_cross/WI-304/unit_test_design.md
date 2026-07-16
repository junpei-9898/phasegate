# WI-304 Unit Test Design

<!-- @work-item-id WI-304 -->

| ID | Case | Expected |
|---|---|---|
| UT-WI304-UC-001 | world disabled | port未実行、disabled DTO |
| UT-WI304-UC-002 | mixed classifications | blocking → cleanup → waivedの決定的順序 |
| UT-WI304-UC-003 | 604 adopted legacy | items 0、adoptedLegacyCount 604 |
| UT-WI304-PRES-001 | 6件、maxItems 5 | 5件 + deterministic omission line |
| UT-WI304-PRES-002 | long entries、maxChars 2000 | 2000 scalar以下、entry途中切断なし |
| UT-WI304-PRES-003 | surrogate pairを含むID | UTF-16 unitでなくUnicode scalar count |
| UT-WI304-PRES-004 | unavailable | 固定一行warning、repo reason非表示 |
| UT-WI304-PRES-005 | reason / detailsを含むprovider data | contextへ中継しない |

テスト名は日本語、AAAとする。application usecaseはdeterministic fake portを使用し、domain objectをmockしない。
