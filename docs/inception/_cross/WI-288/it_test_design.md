# WI-288 Integration Test Design: Filesystem traceability facade

<!-- @work-item-id WI-288 -->

@story-id H17-03

## 1. Scope

temporary repositoryへcanonical Unit definition、Story / AC catalog、inception WorkItem、annotated test sourceを配置し、public `createTraceabilityModelModule`から`worldReadFacade.read()`までを通す。

## 2. Cases

| ID | Fixture | 期待 |
|---|---|---|
| IT-WM288-001 | 2 Units、2 Stories / AC、legacy Story、legacy WorkItem、annotated tests |全plain DTOとalias / provenanceを返す |
| IT-WM288-002 | filesystem entry作成順を反転した同内容repo | facade outputがdeep equalになる |
| IT-WM288-003 | duplicate WI、directory mismatch、unknown test Story | no-winner diagnosticを返しinvalid recordを除外する |
| IT-WM288-004 | public index / module factory経路 | deep infrastructure importなしでfacadeを取得できる |

## 3. Fixture policy

- `mkdtemp`配下だけへwriteし、repository corpusを変更しない。
- story / Unit / WI / test fileは必要最小限のMarkdown / TypeScriptを使う。
- expected DTOはfixture literalから独立に記述し、production parserやsort helperで組み立てない。
- afterEachでtemporary rootを削除する。

## 4. Ownership assertions

- traceability TestReferenceはfile binding / null testNameだけを返す。
- matrix schema、generatedAt、coverage / case-level bindingをfacade resultへ含めない。
- outputにStoryId / ProjectRelativePath / WorkItemFrontmatter instanceを含めない。

