# WI-287 Logical Design: Pure World domain slice

<!-- @work-item-id WI-287 -->

@story-id H17-02

## 1. Package layout

```text
scripts/harness/world-model/domain/
├── value-objects/
│   ├── artifact-kind.ts
│   ├── corpus-role.ts
│   ├── declared-key.ts
│   ├── evaluation-id.ts
│   ├── path-key.ts
│   ├── sha256-digest.ts
│   └── world-node-id.ts
├── entities/
│   ├── edge.ts
│   ├── extraction-diagnostic.ts
│   ├── snapshot.ts
│   └── world-node.ts
├── services/
│   ├── canonical-json-serializer.ts
│   ├── snapshot-root-deriver.ts
│   └── text-content-normalizer.ts
└── ports/
    └── world-hashing-port.ts
```

`index.ts`、public facade、composition-root、application / infrastructure / presentationは作らない。

## 2. Dependency flow

```text
WorldNode / Edge / ExtractionDiagnostic
  -> canonical domain projection
  -> SnapshotRootDeriver stable set sort
  -> CanonicalJsonSerializer
  -> WorldHashingPort
  -> Sha256Digest / EvaluationId
  -> Snapshot
```

entityはhash providerを知らない。root derivation serviceだけがconsumer-owned portを受ける。testではdomain objectをmockせず、入力bytesから常に同じvalid digestを返し、受領bytesを観測できるdeterministic port実装を使う。

## 3. WorldNodeId codec

- factoryはtype別tupleからcanonical external stringを生成する。
- parserはprefix / discriminatorを解析し、同じfactoryで再構成したstringとの完全一致を要求する。
- scalar / path segmentはRFC 3986 percent encodingを使い、`/`はPathKey segment separatorとしてだけ保持する。
- TestReferenceのoptional testNameは`none`または`value:<encoded-name>`で区別する。
- parse failureはtyped domain errorとし、部分的IDを返さない。

## 4. Snapshot canonical set order

- nodes: `WorldNodeId`
- edges: `edgeType`, `from`, `to`, canonical qualifier
- diagnostics: `code`, node ID or empty, PathKey or empty, line or 0, canonical payload
- constraints / claims / aliases:各declaration ID

serializerはarrayをsortしない。意味上setであるcollectionだけをroot deriverがcopy-sortし、caller配列をmutationしない。

## 5. TDD sequence

1. RED: ID、canonical JSON、text、Snapshot root / evaluation ID testを追加し、module不存在を確認する。
2. GREEN: VO → serializer / normalizer → entity → root deriverの順に最小実装する。
3. REFACTOR: stable sort、error contract、immutability、import boundaryを監査する。

## 6. Deferred integration

- attestation `Sha256Capability` adapterはinfrastructure導入WIで追加する。
- filesystem / symlink / strict file byte readはWM-09/10。
- owner-aware generated projectionはWM-10。
- use case / composition / public facadeはWM-11。
- constraint admission / WCRはWM-12/13。

