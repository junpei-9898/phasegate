# WI-288 Logical Design: Public traceability read facade

<!-- @work-item-id WI-288 -->

@story-id H17-03

## 1. Package changes

```text
scripts/harness/traceability-model/
├── application/
│   ├── dto/traceability-world-read-dto.ts
│   ├── facades/traceability-world-read-facade.ts
│   └── ports/traceability-world-read-source-port.ts
├── infrastructure/
│   ├── adapters/file-system-traceability-world-read-adapter.ts
│   └── parsers/story-catalog-parser.ts
├── composition-root.ts
└── index.ts
```

## 2. Dependency flow

```text
existing parsers / Unit gateway / filesystem
  -> TraceabilityWorldReadSourcePort raw scalar records
  -> TraceabilityWorldReadFacade identity admission / no-winner / sort
  -> TraceabilityWorldReadDto
  -> traceability-model/index.ts
  -> future world-model consumer adapter
```

facadeはfilesystem、Markdown、domain VOを直接知らない。infrastructure adapterはexisting parserを利用し、application DTOへparser resultやgatewayを渡さない。

## 3. Source adapter

- Unit: `MarkdownUnitDefinitionGateway.getAllUnitNames()`とcanonical filename規則からdefinition / construction pathを返す。
- Story / AC: `user_stories.md`を読み、structured heading / AC item / `旧US`を既存story catalog parser拡張で抽出する。
- WorkItem: `docs/inception/**/WI-*/description.md`を決定的に走査し、existing `parseWorkItemFrontmatter`を使う。
- TestReference: configured test rootsのtest filesを走査し、existing `parseTestTags`の`@story` lineをraw provenanceとして返す。
- read / parse failureはempty successにせずsource diagnosticへ変換する。

## 4. Application facade

1. source recordsを一回取得する。
2. required owner IDをadmitする。
3. Unit / Story / WorkItem duplicateとdirectory mismatchをdiagnosticにし、winnerを選ばない。
4. unique StoryからAC DTOを作る。
5. known Storyのtest annotationを各ACへfile bindingでfan-outする。
6.全collectionをcanonical tupleでsortし、deep plain DTOとして返す。

## 5. Public surface

既存`index.ts`から`TraceabilityWorldReadFacade`とnested DTO typesを追加公開する。`createTraceabilityModelModule(rootDir).worldReadFacade`をstandard wiringとする。

existing StoryId / ProjectRelativePath exportはbackward compatibilityのため変更しないが、新facadeの戻り値には含めない。

## 6. TDD sequence

1. RED: facade plain DTO / no-winner / sort、story parser、public filesystem contract testを追加する。
2. GREEN: DTO / source port / facade、parser拡張、filesystem adapter、composition / index wiringを実装する。
3. REFACTOR: deterministic order、plain-object boundary、matrix ownership非重複、existing regressionを監査する。

