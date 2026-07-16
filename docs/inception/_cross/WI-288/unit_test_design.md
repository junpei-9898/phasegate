# WI-288 Unit Test Design: Traceability read facade

<!-- @work-item-id WI-288 -->

@story-id H17-03

## 1. Policy

- test名は日本語、Arrange / Act / Assertを分離する。
- application facade testではsource portのdeterministic fakeだけを用い、domain objectをfake化しない。
- DTO shapeはJSON round-trip、prototype、公開scalarを観測し、interfaceだけのcompile assertionで済ませない。
- expected sort orderはproduction comparatorから生成しない。

## 2. Facade cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM288-FAC-001 | Unit / Story / AC / WI / test raw records | versioned plain DTOへ投影する |
| UT-WM288-FAC-002 | WorkItem `legacy_id` | canonical WIの`legacyIds[]`として公開する |
| UT-WM288-FAC-003 | Unit / Story / WI / test列挙順を反転 | outputがbyte-equivalentになる |
| UT-WM288-FAC-004 | duplicate canonical WI / Story / Unit | winnerを選ばずdiagnosticへ出す |
| UT-WM288-FAC-005 | directory / frontmatter WI mismatch | WorkItemを出さずdiagnosticへ出す |
| UT-WM288-FAC-006 | missing / invalid owner ID | partial nodeを返さずdiagnosticへ出す |
| UT-WM288-FAC-007 | unknown Storyのtest annotation | TestReferenceを作らずdiagnosticへ出す |
| UT-WM288-FAC-008 | known Storyのfile-level annotation |全ACへbinding fileでfan-outする |

## 3. Parser cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM288-PARSE-001 | Story heading / AC checklist / legacy ID | structured entryとsource lineを返す |
| UT-WM288-PARSE-002 | Story内の`####` heading | Story scopeを閉じず後続ACを読む |
| UT-WM288-PARSE-003 |次のStory / top-level section |前Story scopeを閉じる |

## 4. Public contract cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM288-CON-001 | facade resultをJSON serialize / parse |同じplain structureになる |
| UT-WM288-CON-002 | nested DTOのruntime prototypeを確認 |domain VO / Map / Set / class instanceを含まない |
| UT-WM288-CON-003 | root index import |facade class / DTO contractがsupported public pathから利用できる |

