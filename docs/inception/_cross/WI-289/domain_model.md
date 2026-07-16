# WI-289 Domain Model: Design corpus facts

<!-- @work-item-id WI-289 -->

@story-id H17-04

## 1. Extraction result

`DesignFactExtraction`は次のimmutable collectionを返す。

| Fact | 内容 |
|---|---|
| `WorldNode[]` | Artifact、explicit / legacy Fragment、canonical WorkItem |
| `Edge[]` | `proposed-by`、`reflected-in`、`traces-to`、`reflected-as` |
| `ExtractionDiagnostic[]` | parse / I/O / unsupported / duplicate / missing endpoint。severity / blockingなし |

extractor内部のdeclaration candidateは最終Snapshot factではない。coordinatorが全corpus candidateをadmitし、duplicate / endpoint resolution後にedgeへ変換する。

## 2. Artifact classification

| Extractor | ArtifactKind | CorpusRole | Canonical scope |
|---|---|---|---|
| Product | design-document | product | `docs/product/**/*.md`、canonical Unit definitionを除く |
| Proposal | design-document | inception | `docs/inception/**/*.md` |
| ADR | design-document | adr | `docs/ADR/*.md` |
| Unit | design-document | product | `docs/product/units/<kebab-case Unit ID>_unit.md` |

productとinceptionはbytes / digestが同じでも別Artifact IDである。Unit definitionはproduct roleだが専用extractorがowner Unit IDをtraceability projectionから付与し、Product extractorとの二重抽出を避ける。

## 3. Fragment admission

- valid markerはfence外の単独HTML comment line `<!-- @world-fragment-id <DeclaredKey> -->`。
- markerを含むcontiguous preludeはfragment / reflects / work-item commentだけで構成され、直後がATX headingでなければならない。
- identityは`CorpusRole + DeclaredKey`だけ。locatorはartifact ID、marker line、heading line / level / text、range end lineをattributesに置く。
- explicit fragment digestはheading lineから次のmarker-bound heading直前、またはEOFまでのLF-normalized UTF-8 bytes。
- duplicate IDはcandidate全件を除外し`duplicate-node-id`を返す。

## 4. Migration state

| State | 条件 | Node |
|---|---|---|
| whole-file | valid explicit markerなし | legacy whole-file Fragment |
| mixed | explicit markerあり、valid completionなし | explicit Fragment + compatibility fallback |
| explicit | explicit markerあり、valid completionあり | explicit Fragmentのみ |

completion markerがfragmentなし、重複、またはfrontmatter / first heading規則外ならdiagnosticとし、invalid completionでfallbackを消さない。legacy inbound referenceの0件確認はconstraint repository導入後のmigration gateへ残す。

## 5. Traceability projection

- canonical WorkItem DTOはcanonical JSON bytesをhashし`WorldNode.workItem`へ変換する。legacy IDはattributesのaliasであり別nodeにしない。
- Unit DTOはdefinition pathからUnit artifactの`unitId`を解決する。
- Story DTOはowner `sourcePath`が一致するproduct Artifactのsorted `storyIds` attributeへ投影する。Story / ACの新しいWorld node typeは発明しない。
- provider diagnosticは`provider-diagnostic`へ変換し、provider code / subject / paths / messageをpayloadにlossless保持する。

## 6. Reference edges

- inception Artifact / Fragment `--proposed-by-->` WorkItem
- WorkItem `--reflected-in-->` product Artifact / Fragment
- ADR Artifact / Fragment `--traces-to-->` WorkItem
- inception explicit Fragment `--reflected-as-->` product explicit Fragment（`@world-reflects`のみ）

unknown WorkItem、invalid role / key、missing / ambiguous reflection targetはedgeを作らずdiagnosticにする。
