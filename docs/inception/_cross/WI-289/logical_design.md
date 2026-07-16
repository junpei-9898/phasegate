# WI-289 Logical Design: Design corpus extractor adapters

<!-- @work-item-id WI-289 -->

@story-id H17-04

## 1. Package layout

```text
scripts/harness/world-model/infrastructure/adapters/
├── design-fact-extraction.ts
├── markdown-design-fact-extractor.ts
├── product-fact-extractor.ts
├── proposal-fact-extractor.ts
├── adr-fact-extractor.ts
├── unit-fact-extractor.ts
├── traceability-design-fact-adapter.ts
└── design-corpus-fact-extractor.ts
```

4つの専用extractorはroot / role / exclusion policyだけを持ち、Markdown parsingとfilesystem admissionは共通adapterへ委譲する。`DesignCorpusFactExtractor`は候補集合のduplicate / reference resolutionを行うinfrastructure coordinatorであり、application composition-rootではない。

## 2. Dependency flow

```text
filesystem bytes
  -> TextContentNormalizer / WorldHashingPort
  -> MarkdownDesignFactExtractor candidate facts
  -> product / proposal / ADR / Unit scope adapter

traceability-model/index.ts plain facade
  -> TraceabilityDesignFactAdapter
  -> WorkItem nodes + Unit / Story / diagnostic index

all candidates + traceability index
  -> DesignCorpusFactExtractor no-winner / endpoint resolution
  -> WorldNode[] / Edge[] / ExtractionDiagnostic[]
```

infrastructureはWorld domainをimportしてよい。traceability-modelはpublic `index.ts`からtype-only DTO / facade contractだけをimportし、domain / infrastructure pathへdeep importしない。

## 3. Filesystem admission

- `readdir(..., {withFileTypes:true})`を名前順に再帰走査し、absolute rootはnode identity / attributesへ入れない。
- regular Markdown fileだけを読む。symlinkはfollowせず`unsupported-file-type`、非Markdown regular fileは`unsupported-corpus-file`。
- PathKey invalid、read failure、invalid UTF-8はpath / source payload付きdiagnosticへ変換する。
- case-sensitive pathを保持し、case-fold collisionは全candidateを除外してdiagnosticにする。

## 4. Markdown parser

fenced code内を無視するline scannerでexact comment markerを収集する。malformed marker textはraw lineをpayloadに保持する。fragment preludeは空行 / proseを許さず、複数fragment markerやorphan markerをadmitしない。

`@work-item-id`はcomma / whitespace区切りで一IDずつ展開する。valid fragment prelude内ならFragment locator、その他はArtifact locatorへbindする。`@world-reflects`はvalid product Fragment preludeだけをadmitする。

## 5. Coordinator admission order

1. traceability public facadeを一度readし、provider diagnosticを変換する。
2. 4 extractorを実行し、Artifact / Fragment candidateを集約する。
3. case-fold collisionと同一canonical node IDをgroup化し、candidate全件を除外する。
4. canonical WorkItem参照を解決し、role別edgeを作る。
5. reflection targetを`inception:<DeclaredKey>`へ解決し、unique targetだけに`reflected-as`を作る。
6. node / edge / diagnosticをcanonical tupleでcopy-sortして返す。

## 6. TDD sequence

1. RED: fixture、marker / migration / duplicate / traceability boundary testを追加しmodule不存在を確認する。
2. GREEN: result DTO、common parser、4 scope adapter、traceability adapter、coordinatorの順に実装する。
3. REFACTOR: order independence、lossless diagnostics、public import boundary、composition / index不変を監査する。
