# WI-291 Domain Model: Assembled Snapshot と inspection projection

<!-- @work-item-id WI-291 -->

@story-id H17-06

## 1. WorldFactBatch

各extractorの`nodes / edges / diagnostics`をapplication境界で同じimmutable shapeとして扱う。provider固有DTOをBuildSnapshotへ漏らさない。

```text
WorldFactBatch {
  nodes: WorldNode[]
  edges: Edge[]
  diagnostics: ExtractionDiagnostic[]
}
```

## 2. Graph admission

`BuildSnapshotUseCase`は全batchを結合して次の順でadmitする。

1. node IDでgroup化する。
2. candidateが1件のnodeだけをadmitする。
3. 2件以上は全candidateを除外し`duplicate-node-id`を追加する。
4. edge canonical tupleをdeduplicateする。
5. admitted nodeに存在しないendpointを持つedgeは除外し`missing-edge-endpoint`を追加する。
6. node / edge / diagnosticをcanonical orderへ渡してSnapshotを構築する。

duplicateやdangling edgeから意味的winner / continuityを推論しない。

## 3. Snapshot version inputs

```text
schemaVersion    = phasegate-world-snapshot/v1
extractorVersion = phasegate-world-extractor/v1
corpusConfigDigest = sha256(canonical semantic World corpus config)
```

corpus config projectionにはproduct / inception / ADR / source rootとmatrix / attestation / integrity input pathを含む。absolute checkout root、output format、clock、`world.enabled`は含めない。

## 4. WorldInspectionDto

plain public DTOは次を持つ。

- snapshot ID、schema / extractor version、`corpusRoot`
- node / edge / diagnostic count
- node type、corpus role、artifact kind別inventory
- stable ID順のnode projection
- canonical tuple順のedge projection
- canonical順のdiagnostic projection
- hard diagnostic count

DTOはdomain Entity / VO instanceを公開せず、JSON data modelのplain object / array / scalarだけにする。`generatedAt`を持たない。

## 5. Exit classification

- `not-present`: optional owner inputの観測でありnon-hard
- その他のExtractionDiagnostic: hard
- Snapshotを構築できたhard diagnostic: exit 1
- invocation / config / I/O / hashing等でSnapshot自体が作れない: exit 2
- hard diagnosticなし: exit 0

exit codeの所有はpresentation contractであり、Snapshot domainへ保存しない。
