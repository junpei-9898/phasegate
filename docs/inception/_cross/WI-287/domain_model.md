# WI-287 Domain Model: Identity、canonical roots、Snapshot

<!-- @work-item-id WI-287 -->

@story-id H17-02

## 1. Model allocation

| Model | Classification | Invariant |
|---|---|---|
| `PathKey` | Value Object | project-relative POSIX。`.` / duplicate separatorを除去し、absolute / drive / backslash / `..`を拒否 |
| `DeclaredKey` | Value Object | `[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*` |
| `Sha256Digest` | Value Object | `sha256:<64 lowercase hex>` |
| `CorpusRole` | Value Object | `product / inception / adr / generated / external` |
| `ArtifactKind` | Value Object | ADR-031の4分類。generic Artifact IDでは`source`を使わない |
| `WorldNodeId` | Value Object | ADR-032全node typeの`pgw:v1` external form |
| `EvaluationId` | Value Object | `pgw:v1:evaluation:sha256:<64 lowercase hex>` |
| `WorldNode` | Entity | stable IDとcontent digest、type固有projectionを保持 |
| `Edge` | Value Object | type / from / to / qualifierの有向fact |
| `ExtractionDiagnostic` | Value Object | gate policyを持たないstable diagnostic projection |
| `Snapshot` | immutable derived entity | sorted corpus factsとthree-root boundaryを保持 |

## 2. Identity invariants

- Artifact IDは`design-document × product|inception|adr`、`generated-artifact × generated`、`external-declaration × external`だけを許可する。
- sourceは`SourceFile` IDだけで表し、generic Artifact IDを二重生成しない。
- explicit Fragment IDは`corpusRole + DeclaredKey`だけを使い、path / heading / line / digestを含めない。
- legacy Fragment IDは`artifactKind + corpusRole + PathKey`を使う。
- TestReferenceはowner tuple `(storyId, acId, binding ?? file, testType, path, testName)`をpercent-encodedする。Story / ACのdomain validationはprovider ownerに残す。
- percent encodingはUTF-8かつcanonical uppercase hexとし、decode後に同じexternal formへ再encodeできないIDを拒否する。

## 3. Canonical JSON

許可値は`null`、boolean、finite number、string、dense array、string-key plain objectだけとする。object keyは各階層でECMAScript ascending sortし、arrayは入力順を保持する。set-valued collectionのsortはSnapshot projection側で行う。

serializerはBOM、indent、trailing newlineのないUTF-8 bytesを返す。`undefined`、sparse array、function、symbol、bigint、NaN / Infinity、cycle、accessor / symbol key、non-plain objectをsilent omissionせず拒否する。

## 4. Text normalization

`TextContentNormalizer`はfatal UTF-8 decodeを行い、`\r\n`とlone `\r`だけを`\n`へ変換する。Unicode normalization、BOM除去、whitespace trim、final newline補完はしない。invalid UTF-8は`invalid-utf8`の`ExtractionDiagnostic`を返す。

fragment marker行をcontent rangeから除外する責務はWM-09のMarkdown extractorにあり、generic text normalizerは任意の行を削除しない。

## 5. Root boundary

`SnapshotRootDeriver`は`WorldHashingPort.sha256(bytes)`だけに依存する。

```text
corpusRoot = hash(canonical({
  schemaVersion,
  extractorVersion,
  corpusConfigDigest,
  nodes: sort(id),
  edges: sort(type/from/to/qualifier),
  extractionDiagnostics: sort(code/node/path/line/payload)
}))
```

`constraintRoot`はruleset / config digestとID付きplain declaration projectionをsortしてhashする。`evaluationId`は`schemaVersion`、`rulesetVersion`、`corpusRoot`、`constraintRoot`、`evaluationConfigDigest`、`policyInputsDigest`だけをhashする。constraint semantics / findings / policy classificationは後続WMへ残す。

`Snapshot`のidentityは`pgw:v1:snapshot:<corpusRoot>`。constraintRoot / evaluationIdは同じcorpus snapshotへ後続導出を関連づけるoptional boundaryであり、corpusRoot preimageへ戻さない。

## 6. Domain dependency rule

domainはECMAScriptのpure `TextEncoder` / `TextDecoder`以外のruntime capabilityを使わない。`node:crypto`、`node:fs`、attestation、traceability-model、nyquist-validation、validator-systemをimportしない。

