# WI-288 Domain Model: Traceability World read DTO

<!-- @work-item-id WI-288 -->

@story-id H17-03

## 1. Ownership

traceability-modelはowner corpusからcanonical identityとprovenanceを解決する。facadeは新しいWorld domainを作らず、application DTOへowner-owned factsを投影する。

| DTO | Owner fact | Plain contract |
|---|---|---|
| `TraceabilityUnitDto` | Unit definition | Unit ID、definition path、construction root |
| `TraceabilityStoryDto` | product Story catalog | canonical Story ID、legacy IDs、source locator |
| `TraceabilityAcceptanceCriterionDto` | Story catalog AC item | Story ID、AC ID、source locator |
| `TraceabilityWorkItemDto` | inception description frontmatter | canonical WI ID、legacy IDs、type / status / affects、description path |
| `TraceabilityTestReferenceDto` | test source `@story` metadata | Story / AC / file / type / file binding、annotation provenance |
| `TraceabilityReadDiagnosticDto` | owner resolution failure | code、subject、sorted source paths。severity / blockingなし |

## 2. Public aggregate DTO

```text
TraceabilityWorldReadDto {
  schemaVersion: "phasegate-traceability-world-read/v1"
  units[]
  stories[]
  acceptanceCriteria[]
  workItems[]
  testReferences[]
  diagnostics[]
}
```

全要素はplain scalar / array / objectだけで構成する。`StoryId`、`ProjectRelativePath`、`WorkItemFrontmatter`、Map / Set、Error、gateway / parser objectを返さない。

## 3. Identity / alias invariants

- Unit IDはcanonical Unit definitionの明示ID。
- Story IDはowner parserが認識した`HXX-XX` / `HFN-XX`。
- WorkItem IDはdirectory / frontmatter一致かつ一意な`WI-\d+`。
- `legacy_id`は別nodeでなく`legacyIds[]`としてcanonical ownerに属する。
- AC IDはStory scope内の`AC-N`。global identityはconsumerが`storyId + acId` tupleから作る。
- TestReference identity tupleは`storyId + acId + file + testType + filePath + null testName`。annotation lineはprovenanceでありidentityにしない。
- duplicate / mismatchはno-winner。filesystem先頭candidateを採用しない。

## 4. Deterministic order

- units: Unit ID、definition path
- stories: Story ID、source path
- ACs: Story ID、numeric AC ID、source path
- work items: WorkItem ID、description path
- test references: Story ID、AC ID、binding、test type、file path、test name
- diagnostics: code、subject ID、source path tuple

sortはlocale依存比較を使わず、ECMAScript string ascendingとnumeric AC componentを使う。

## 5. TestReference boundary

traceability facadeは`@story` annotationをfile-level referenceとして観測し、そのStoryの各ACへfan-outする。`@ac`とtest case nameのpositional interpretation、matrix binding / dedup / coverageはnyquist-validation ownerのままとする。

