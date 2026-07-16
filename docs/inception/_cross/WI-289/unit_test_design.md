# WI-289 Unit Test Design: Design fact extraction

<!-- @work-item-id WI-289 -->

@story-id H17-04

## 1. Policy

- test名は日本語、Arrange / Act / Assertを分離する。
- WorldNode / Edge / ExtractionDiagnostic / VOはproduction実体を使う。
- filesystem port相当の単体入力はtemporary fixtureかliteral file recordを使い、domain objectをmockしない。
- hashingは入力bytesから決定的なvalid digestを返すtest-local implementationを使う。

## 2. Markdown / migration cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM289-MD-001 | valid prelude + ATX heading | explicit Fragmentとlocatorを返す |
| UT-WM289-MD-002 | markerなし | legacy whole-file Fragmentだけを返す |
| UT-WM289-MD-003 | markerあり、completionなし | explicit + compatibility fallbackを返す |
| UT-WM289-MD-004 | valid completionあり | explicitだけを返す |
| UT-WM289-MD-005 | blank / prose / malformed / fenced example | orphan / malformedを診断しexampleは抽出しない |
| UT-WM289-MD-006 | completionのみ / misplaced / duplicate | fallbackを維持しdiagnosticを返す |
| UT-WM289-MD-007 | LF / CRLF同内容 |同じArtifact / Fragment digestになる |

## 3. Admission / reference cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM289-ADM-001 | same role / DeclaredKeyが2 path | winnerなし、`duplicate-node-id` |
| UT-WM289-ADM-002 |同bytesのproduct / inception |別ID、同digestを保持する |
| UT-WM289-REF-001 |複数`@work-item-id` |1 IDずつrole方向のedgeへ展開する |
| UT-WM289-REF-002 | unknown WorkItem |edgeなし、diagnostic |
| UT-WM289-REF-003 | valid `inception:key` target | proposal → canonical `reflected-as` |
| UT-WM289-REF-004 | invalid role / missing / duplicate target |edgeなし、diagnostic |
| UT-WM289-ACL-001 | plain traceability DTO |WorkItem node、Unit / Story indexへ変換する |
| UT-WM289-ACL-002 | provider diagnostic |全fieldをpayloadに保持する |

## 4. Scope adapter cases

- product extractorはcanonical Unit definitionを除外し、integration contractをproduct artifactとして読む。
- Unit extractorは`*_unit.md`だけをadmitし、traceability definition pathとUnit IDを対応づける。
- proposal / ADR extractorは別CorpusRoleを使う。
- symlink、non-Markdown、case-fold collision、read / UTF-8 failureをsilent omissionしない。
