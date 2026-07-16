# WI-289 Integration Test Design: Design corpus filesystem fixtures

<!-- @work-item-id WI-289 -->

@story-id H17-04

## 1. Fixture layout

`scripts/harness/__tests__/fixtures/world-model/design-corpus/`に、product、inception、ADR、Unit definitionを同じrepository layoutで配置する。valid、duplicate、malformed / unsupported variantをfixture directoryで分け、testはtemporary rootへcopyして実filesystemを読む。

## 2. Cases

| ID | Fixture | 期待 |
|---|---|---|
| IT-WM289-001 | minimal-valid | 4 role/scopeのArtifact、explicit / legacy Fragment、WorkItem node、provenance / reflection edgeを返す |
| IT-WM289-002 | same bytes product / inception | digest一致でもArtifact / Fragment IDを分離する |
| IT-WM289-003 | duplicate marker | ambiguous Fragmentを全除外しdiagnosticを返す |
| IT-WM289-004 | malformed / orphan / missing reflection | silent omissionせずpath / line / raw payloadを返す |
| IT-WM289-005 | entry作成順 / absolute temp root / LF-CRLF差 | canonical fact projectionが一致する |
| IT-WM289-006 | symlink / unsupported extension | targetをfollowせずdiagnosticを返す |
| IT-WM289-007 | public traceability facade | public `index.ts`経由だけでowner projectionを変換する |

## 3. Assertions

- expected ID / edge / diagnosticはliteralで記述し、production parserでexpectedを作らない。
- `node:crypto`はworld-model sourceから直接importせず、integration testはattestation public SHA capabilityをWorldHashingPortへadaptする。
- composition-root / index.tsにWM-09差分がないことをsource boundary testで確認する。
