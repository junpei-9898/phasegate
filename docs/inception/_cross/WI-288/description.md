---
id: WI-288
type: story
severity: high
status: drafted
affects: [traceability-model]
source: internal
---

# WI-288: Traceability plain DTO read facade

<!-- @work-item-id WI-288 -->

@story-id H17-03

## 背景

ADR-031はtraceability-modelをUnit / Story / AC / WorkItem identityとmetadata lifecycleのownerとし、world-modelはprovider domain型を複製せずplain DTO / public facadeから観測すると決定した。ADR-032はcanonical WorkItem ID、provider-owned legacy aliasとTestReference identity tupleを固定した。

現行traceability-modelはStoryId、frontmatter parser、Unit / Story filesystem gatewayを持つが、外部consumerはcomposition-rootの個別gatewayやdomain VOを参照しなければcorpusを一括取得できない。WM-08では既存parser / filesystem経路を一つのapplication read facadeへまとめ、domain型を含まないversioned DTOをpublic indexから公開する。

## スコープ

- Unit / Story / AC / WorkItem / file-level TestReference provenanceのplain DTO
- application `TraceabilityWorldReadFacade`とconsumer-independent source port
- existing Unit gateway、story catalog / work-item frontmatter / test metadata parserを利用するfilesystem adapter
- canonical `WI-\d+`、WorkItem / Story legacy alias、affects / source pathの公開
- duplicate / missing / directory mismatchをno-winner diagnosticとして公開
- stable scalar / path tupleによる決定的sort
- traceability-model composition-root / indexからのfacade公開
- facade unit / public contract / filesystem integration test

## TestReference ownership

本facadeのTestReferenceはtraceability metadataの`@story` annotationから作るfile-level provenanceである。Storyの全ACへ`binding: "file"`、`testName: null`で接続し、lineはidentityではなくprovenanceに置く。

case-level test name、`@ac` positional binding、matrix dedup、coverage semanticsはnyquist-validationのMatrix World Read DTOが所有する。traceability-modelはmatrix schemaやcase-level parserを複製しない。

## スコープ外

- world-model consumer-owned adapter / WorldNode変換（WM-09）
- nyquist-validation matrix public facadeとcase-level TestReference projection（WM-10）
- World extractor / Snapshot / composition-root
- Story / WorkItem domain VOの廃止や既存public exportのbreaking変更
- matrix生成、coverage判定、gate / blocking policy

## 受け入れ基準

- public facadeがversioned plain DTOとしてUnit / Story / AC / WorkItem / TestReferenceとdiagnosticを返す。
- DTOはstring / number / boolean / null / array / plain objectだけで構成し、StoryId、ProjectRelativePath、frontmatter parser result、gateway instanceを含めない。
- WorkItemはdirectory / frontmatter一致かつ一意なcanonical `WI-\d+`だけを返し、`legacy_id`は`legacyIds[]`へ公開する。
- duplicate canonical ID、directory mismatch、missing / invalid owner IDはwinnerを選ばずdiagnosticへ出す。
- Story / AC / Unit / WorkItem / TestReference / diagnosticの順序はfilesystem列挙順に依存しない。
- TestReferenceはfile-level annotation provenanceであり、matrix owner semanticsを主張しない。
- traceability-model既存test、L1、L2、check-readyがgreenを維持する。

## 成果物

- `docs/inception/_cross/WI-288/{description,domain_model,logical_design,unit_test_design,it_test_design}.md`
- traceability-model product construction 4文書への累積反映
- application DTO / facade / source port
- infrastructure filesystem adapterとstory catalog entry parser拡張
- composition-root / public index更新
- unit / integration / contract tests
- CHANGELOG / package version 0.243.0

## 依存と後続

- ADR-031/032、H17-03、WM-05のintegration contractに従う。
- WM-09が本facadeをworld-model infrastructureのconsumer-owned adapterから利用する。
- WM-10はnyquist-validation matrix owner projectionを別portから利用する。

